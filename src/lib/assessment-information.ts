// Public, version-scoped explanation. Evidence and unresolved policy decisions:
// docs/privacy-reconciliation.md. Do not add enforcement mechanics here.
export const MONITORING_GUIDE_PATH = "/docs/what-access-checks-and-records";

export const assessmentInformation = {
  versionContext: "This explanation covers the desktop assessment flow reviewed in Access 2.3.1. Your organizer’s instructions should identify the version, required checks and arrangements for your round.",
  camera: "Camera checks support device setup and face presence during a session. Local calibration images are separate from session images: when a presence check finds no face or more than one face, a still image can be included in the activity sent to the assessment service.",
  microphone: "The app requests microphone access during setup and when opening the live session media stream. Permission to use a microphone is not, by itself, evidence that audio is recorded or stored. The reviewed 2.3.1 flow does not include continuous audio or video recording.",
  activity: "Session records can include window-focus changes, connection status, device-check results, camera availability and presence-check outcomes, with associated times. Events are queued on the device and sent to the assessment service.",
  cleanup: "Calibration images are stored temporarily on the device. The app attempts to remove them when the secured session ends and at its next startup; a crash or file-access problem can delay removal. This cleanup does not delete separate session images or records already sent to the service.",
  decisions: [
    "Code judging can produce automated evaluation results.",
    "Required readiness and entry checks can prevent participation when they are not met.",
    "Session activity provides context for review. An activity flag alone is not proof of misconduct.",
    "Your organizer should explain how results are decided, how technical issues are considered and how to request a review.",
  ],
};

export const monitoringCategories = [
  {
    title: "Camera and presence",
    purpose: "Test the camera, complete calibration and check face presence during a session.",
    handling: "Calibration captures stay on the device in the reviewed flow. Separate presence-check stills can be sent with session events. Presence detection does not, by itself, verify identity.",
  },
  {
    title: "Microphone",
    purpose: "Check microphone access and open the media stream used by the session.",
    handling: "The reviewed flow requests access but does not include continuous audio recording or upload. Read your round’s notice for any additional service or arrangement.",
  },
  {
    title: "Device and connection",
    purpose: "Check whether the computer and its environment meet the round’s requirements.",
    handling: "Operating system, app version, a device identifier and the results of permission, display, running-application and connection checks can be included in readiness reports sent before entry.",
  },
  {
    title: "Session activity",
    purpose: "Record events that help explain what happened during the assessment.",
    handling: "Focus changes, connection and camera status, presence results and other assessment-control events are queued locally and sent with timestamps. Failed delivery may leave records pending on the device.",
  },
  {
    title: "Answers and submissions",
    purpose: "Save work, evaluate submitted code and show results and attempt history.",
    handling: "Editor drafts are saved on your device for recovery. Code and any custom test input are sent to assessment services when you use Run or Submit; results and attempt history come from those services. A local save is different from a successful scored submission.",
  },
  {
    title: "Incident reports",
    purpose: "Help investigate a problem reported during a round.",
    handling: "A report can contain your description, session identifiers and time, device/display details, camera or presence status, and restricted-application findings. Check for a delivery confirmation; if sending is unconfirmed, use your organizer’s support channel.",
  },
];
