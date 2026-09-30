# BridgePulse

**Crowd-sourced structural health monitoring for bridges using smartphone vibration analysis.**

BridgePulse transforms every vehicle crossing into a structural assessment by analyzing vibration data captured through smartphone accelerometers. Using signal processing techniques from peer-reviewed research (Matarazzo & Pakzad 2018, Yang et al. 2004), the system extracts bridge natural frequencies and detects potential structural degradation — without expensive dedicated sensors.

---

## Architecture

```
Mobile App (React Native / Expo)
    │
    ├── Records accelerometer + gyroscope data during bridge crossing
    ├── Applies bandpass filter (1.5–20 Hz), vertical axis isolation
    ├── Computes Welch's PSD with spectral subtraction
    └── Uploads trip results to Supabase
            │
            ▼
    Supabase (PostgreSQL)
    │
    ├── Stores bridge metadata + trip records
    ├── Auto-computes health metrics via database triggers
    └── Real-time subscriptions for live dashboard updates
            │
            ▼
    Dashboard (Next.js + shadcn/ui)
    │
    ├── Real-time bridge status table
    ├── Priority ranking by structural health
    └── Trip history and frequency analysis
```

## Signal Processing Pipeline

The mobile app implements six research-backed noise removal techniques:

| Technique | Purpose | Reference |
|-----------|---------|-----------|
| **Bandpass Filter** (1.5–20 Hz) | Removes car body sway (<1.5 Hz) and engine noise (>20 Hz) | Standard SHM practice |
| **Vertical Axis Isolation** | Extracts only vertical acceleration using gravity vector | Ozer & Feng 2019 |
| **Welch's PSD** | Averages overlapping periodograms for lower noise floor | Welch 1967 |
| **Spectral Subtraction** | Subtracts pre-bridge noise baseline from bridge recording | Yang et al. 2004 |
| **Gyroscope Weighting** | Dampens samples with high rotational velocity (car bounce) | Sensor fusion |
| **Temperature Logging** | Records ambient temperature for frequency normalization | Open-Meteo API |

## Project Structure

```
BridgePulse/
├── mobile/              # React Native (Expo) mobile app
│   ├── src/
│   │   ├── components/  # UI components (waveform, spectrum, cards)
│   │   ├── screens/     # App screens (Map, OnBridge, Summary, Status)
│   │   ├── services/    # Supabase client, bridge fetching, trip upload
│   │   ├── utils/       # Signal processing (FFT, bandpass, Welch's PSD)
│   │   ├── state/       # Zustand store
│   │   └── theme/       # Design tokens, typography, scaling
│   ├── app.json
│   └── package.json
│
├── website/             # Next.js dashboard
│   ├── src/
│   │   ├── app/         # Next.js app router
│   │   ├── components/  # Dashboard UI (shadcn/ui)
│   │   └── lib/         # Supabase client
│   └── package.json
│
└── README.md
```

## Getting Started

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Website Dashboard

```bash
cd website
npm install
npm run dev
```

Open: [will add later].

### Database

Run the SQL schema in your Supabase SQL Editor to create tables, RLS policies, and triggers.

## Tech Stack

- **Mobile**: React Native, Expo, expo-sensors (DeviceMotion), Zustand
- **Backend**: Supabase (PostgreSQL, real-time subscriptions, RLS)
- **Dashboard**: Next.js 15, Tailwind CSS, shadcn/ui, framer-motion
- **Signal Processing**: Goertzel DFT, Butterworth bandpass filter, Welch's method

## References

1. Matarazzo, T.J., Pakzad, S.N. (2018). "Crowdsourcing Bridge Vital Signs with Smartphone Vehicle Trips." *MIT / Lehigh University*
2. Yang, Y.B., Lin, C.W., Yau, J.D. (2004). "Extracting Bridge Frequencies from the Dynamic Response of a Passing Vehicle." *Journal of Sound and Vibration*
3. O'Brien, E.J., Malekjafarian, A., González, A. (2014). "Application of EMD to Drive-By Bridge Damage Detection."
4. Ozer, E., Feng, M.Q. (2019). "Direction-Sensitive Smart Monitoring Using Heterogeneous Smartphone Sensor Data."

## License

MIT