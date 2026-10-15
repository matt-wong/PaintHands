use std::sync::mpsc;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{ErrorKind, FromSample, Sample, SampleFormat, SizedSample};
use serde::Serialize;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use vosk::{DecodingState, Model, Recognizer};

#[derive(Serialize, Clone)]
struct Speech {
    text: String,
    // false while the sentence is still being spoken, true once the speaker pauses
    is_final: bool,
}

// Sent to the front end as "voice-status": empty while listening, otherwise what is wrong
fn status(app: &AppHandle, message: &str) {
    app.emit("voice-status", message).ok();
}

// Listens on a background thread for as long as the app runs
pub fn start(app: AppHandle) {
    std::thread::spawn(move || {
        let model = app
            .path()
            .resolve("vosk/model", BaseDirectory::Resource)
            .ok()
            .and_then(|path| Model::new(path.to_string_lossy()));
        let Some(model) = model else {
            status(&app, "Speech model not found. Run: npm run setup:voice");
            return;
        };

        // Keep retrying, so a microphone plugged in later is picked up
        loop {
            if let Err(e) = listen(&app, &model) {
                status(&app, &e);
            }
            std::thread::sleep(Duration::from_secs(3));
        }
    });
}

// Runs until the microphone fails or is unplugged
fn listen(app: &AppHandle, model: &Model) -> Result<(), String> {
    let device = cpal::default_host()
        .default_input_device()
        .ok_or("No microphone connected")?;
    let config = device.default_input_config().map_err(|e| e.to_string())?;
    let mut recognizer = Recognizer::new(model, config.sample_rate() as f32)
        .ok_or("Could not start the speech recogniser")?;

    // The audio callback must stay fast, so it only passes samples to this thread
    let (sender, receiver) = mpsc::channel();
    let stream = match config.sample_format() {
        SampleFormat::F32 => input_stream::<f32>(&device, config, sender),
        SampleFormat::I16 => input_stream::<i16>(&device, config, sender),
        SampleFormat::I32 => input_stream::<i32>(&device, config, sender),
        format => Err(format!("Unsupported microphone format: {format}")),
    }?;
    stream.play().map_err(|e| e.to_string())?;
    status(app, "");

    let mut last_partial = String::new();
    for message in receiver {
        let state = recognizer
            .accept_waveform(&message?)
            .map_err(|e| e.to_string())?;
        if state == DecodingState::Finalized {
            let text = recognizer
                .result()
                .single()
                .map(|result| result.text.to_string())
                .unwrap_or_default();
            last_partial.clear();
            if !text.is_empty() {
                app.emit("speech", Speech { text, is_final: true }).ok();
            }
        } else {
            let text = recognizer.partial_result().partial.to_string();
            if text != last_partial {
                last_partial = text.clone();
                app.emit("speech", Speech { text, is_final: false }).ok();
            }
        }
    }
    Ok(())
}

fn input_stream<T>(
    device: &cpal::Device,
    config: cpal::SupportedStreamConfig,
    sender: mpsc::Sender<Result<Vec<i16>, String>>,
) -> Result<cpal::Stream, String>
where
    T: SizedSample,
    i16: FromSample<T>,
{
    let channels = config.channels() as usize;
    let errors = sender.clone();
    device
        .build_input_stream(
            config.into(),
            move |data: &[T], _: &_| {
                // Vosk wants one channel of 16-bit samples, so keep only the first channel
                let samples = data
                    .iter()
                    .step_by(channels)
                    .map(|sample| i16::from_sample(*sample))
                    .collect();
                sender.send(Ok(samples)).ok();
            },
            move |err: cpal::Error| match err.kind() {
                // These are warnings: the stream keeps running
                ErrorKind::DeviceChanged | ErrorKind::Xrun | ErrorKind::RealtimeDenied => {}
                _ => {
                    errors.send(Err(err.to_string())).ok();
                }
            },
            None,
        )
        .map_err(|e| e.to_string())
}
