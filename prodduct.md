
# AMS Access — Product Highlights Guide

If you are building a landing page or marketing website for the **AMS Access** application, here is a structured breakdown of the core features, security mechanisms, and capabilities that the website should showcase.

---

## 1. Core Value Proposition (The Hook)

> **"The secure desktop gateway for high-stakes examinations. Combining the flexibility of modern web apps with the uncompromised security of native OS-level enforcement."**
>
> AMS Access wraps examination environments (like web-based IDEs and simulators) inside a hardened, native desktop container. It continuously monitors process trees, inputs, networks, and peripherals to prevent cheating and secure assessment integrity.

---

## 2. Feature & Security Highlights for the Website

### 🔒 Feature 1: Hardened OS Lockdown & Input Control

Explain how the app takes control of the local OS environment to establish a secure testing boundary.

* **Always-on-Top Fullscreen**: Restricts browser resizing, minimizes window escape, and locks focus.
* **Keyboard Shortcut Suppression**: Native keyboard hooks block system-level multitasking commands (e.g., `Alt+Tab`, `Super` key, `Windows` key, `Cmd+Space`, `Alt+F4`).
* **Multi-Monitor Enforcement**: Detects secondary monitors and enforces a single-monitor policy, blocking or blanking external displays to prevent side-screens.
* **Clipboard Sanitation**: Wipes clipboard contents on exam start and prevents copy/paste actions between the host system and the test.
* **Mouse Confinement**: Locks the cursor to the application screen to prevent drag-out actions.

### 🛡️ Feature 2: Native Integrity Telemetry (Rust Engine)

Detail how the app ensures the machine runs in a clean, untampered state using native checks.

* **Restricted Process Scanning**: Scans active processes every 5 seconds to detect and terminate prohibited tools (e.g., Discord, OBS, screen recorders, cheating engines, remote desktop tools like AnyDesk/TeamViewer).
* **Zero-Overhead Virtual Machine (VM) Detection**: Probes hardware tables, hypervisor bits, container roots, and registry indicators to prevent candidates from running the exam inside VirtualBox, VMware, QEMU, or sandbox environments.
* **LD_PRELOAD & Debugger Protection**: Detects injection attacks, library hooks, or attached system debuggers.
* **Anti-Tamper Binary Verification**: Verifies executable hash integrity on startup to ensure the client has not been modified.

### 👁️ Feature 3: On-Device Edge AI Proctoring

Highlight how the app uses client-side machine learning for identity verification and focus monitoring.

* **Zero-Cloud AI Processing**: Runs face tracking and pose estimation (TensorFlow.js BlazeFace) entirely local on the user's CPU, avoiding privacy violations or heavy cloud database costs.
* **Real-Time Focus Tracking**: Measures facial alignment (yaw, pitch, roll) to detect when a student is looking away from their screen or leaving the camera area.
* **Intelligent Grace Periods**: Warns candidates with a visual countdown if anomalous behavior is observed, preventing false positives before logging violations.
* **Offline Telemetry Buffer**: Logs security violations locally if a network drop occurs, batch-syncing them back to proctors once connection is restored.

### ⚡ Feature 4: High-Performance Low-Latency Matching Sandboxes

Focus on specialized features for high-frequency trading (HFT), algorithmic, or interactive coding contests.

* **Microsecond-Precision Performance Testing**: Built-in support for timing algorithmic efficiency down to sub-millisecond ranges using sandboxed Web Workers and shared memory environments.
* **Dedicated Worker Separation**: Isolates heavy matching loops from UI rendering threads to prevent editor lag or compilation freezes.
* **Custom Compiler Sandboxing**: Safely executes C++17, Python3, Java17, Go, and Rust in secure execution sandboxes.

### 🛠️ Feature 5: Built-In Hardware & Diagnostics Control Room

Highlight how the app helps candidates self-diagnose system compatibility issues before the test starts.

* **Interactive Media Viewfinder**: Guides contestants on proper camera positioning, resolution checks, and live frame-rate indicators.
* **Audio Level Diagnostics**: Features mic volume checks and audio tone oscillators to ensure working headsets and inputs.
* **Network Stability Probes**: Reports exact server response times, connection latency, and packet jitter metrics.
* **Redacted Support Export**: Single-click diagnostic report exporter that generates support codes to help proctors assist candidates with setups.

---

## 3. Recommended Landing Page Layout Structure

| Section                  | Headline Theme                         | Elements to Show                                                                                                |
| :----------------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Hero**           | Hardened Security Meets Web Simplicity | Mockup of the secure desktop UI, platform badges (Linux, Windows, macOS), call-to-action to download.           |
| **The Problem**    | Standard Browsers Cannot Secure Exams  | Grid outlining weaknesses in standard web testing (browser tabs, screen recorders, VM bypass, second monitors). |
| **The Shell**      | Inside the AMS Access Sandbox          | Interactive breakdown showing how the Tauri container isolates web applications from OS processes.              |
| **Onboarding**     | 15 Steps to Launch Ready               | Visual step-by-step display showing the automated hardware checks, face scan, and network diagnostic screens.   |
| **The Tech**       | Engineered for High Agency             | Details on the Rust kernel, local TensorFlow implementation, and zero-trust firewall configurations.            |
| **Call to Action** | Secure Your Next Assessment            | Download link and documentation instructions for organizations.                                                 |
