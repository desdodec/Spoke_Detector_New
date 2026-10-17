# Spoke Detector — Data Art Studio

A browser-based art tool for turning handlebar-mounted phone accelerometer recordings into genuine data-driven visual portraits.

## What it does

- Loads phyphox `.xlsx`, Excel, or CSV recordings in the browser.
- Reads `Time`, X/Y/Z acceleration and/or absolute acceleration columns.
- Detects a likely turnaround midpoint, then selects equal-duration outbound and return windows around it.
- Defaults to **20 seconds per side** with a **5 second exclusion on each side of the midpoint** to reduce turn/handling contamination.
- Lets the artist adjust midpoint, window duration, turn exclusion, palette, density, stroke, glow, complexity and background.
- Provides four algorithmic styles:
  - **Pulse Ribbons** — layered contours generated from the selected acceleration samples.
  - **Twin Orbit** — two half-orbits driven by the outbound and return signals, with a central X/Y motion signature.
  - **Step Choir** — detected step-to-step cycles drawn as individual strands.
  - **Motion Weave** — a woven field derived from sequential samples.
- Exports editable **SVG** and 3200 × 3200 **PNG**.

## Data integrity

The artwork engine does **not** use an image-generation model. The visible geometry is computed from the selected sensor samples. Decorative behaviour is limited to deterministic layout, repetition, smoothing and transforms of those samples.

## Run locally

This is intentionally a no-build static app.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

You can also host the repository directly with GitHub Pages.

## Expected phyphox columns

The loader recognises columns containing names similar to:

- `Time (s)`
- `Acceleration x (m/s^2)`
- `Acceleration y (m/s^2)`
- `Acceleration z (m/s^2)`
- `Absolute acceleration (m/s^2)`

If absolute acceleration is absent, it is calculated from X/Y/Z.

## Artistic selection strategy

The default 20-second windows are long enough to contain many gait cycles while remaining local enough to preserve the character of one passage of the walk. The turn exclusion exists because stopping, tapping, moving around the bicycle and changing sides can dominate the accelerometer more strongly than gait itself.

For the current protocol, the recommended workflow is:

1. Record three taps at the start.
2. Push the bicycle outward.
3. Stop, mark the midpoint, turn and change bicycle side.
4. Push back.
5. Record three taps at the end.
6. In the studio, place the midpoint at the centre of the turn and adjust the exclusion zone until neither selected window contains handling/turn movement.

## Next useful improvements

- Explicit automatic detection of the three tap clusters.
- More robust cadence/step segmentation using a proper digital band-pass filter.
- Saved presets and metadata embedded into exported SVG.
- Print templates for T-shirts, A-series posters and square art prints.
- Batch mode for exhibition/event use.
