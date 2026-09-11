import type { ActiveAlert } from "@/domain/entities";

const now = new Date();

function makeAlert(
  id: string,
  severity: "critical" | "warning" | "info",
  type: "aircraft" | "ship" | "satellite" | "launch" | "alert",
  title: string,
  description: string,
  minutesAgo: number,
  entityId: string
): ActiveAlert {
  return {
    id,
    severity,
    type,
    title,
    description,
    timestamp: new Date(now.getTime() - minutesAgo * 60 * 1000),
    entityId,
  };
}

export const alerts: ActiveAlert[] = [
  makeAlert("alert-1", "critical", "aircraft", "Restricted Airspace Breach", "Military aircraft entered restricted zone R-4807 without clearance.", 2, "ae1280"),
  makeAlert("alert-2", "warning", "aircraft", "Unusual Formation", "Five aircraft in unusual formation near Baltic region.", 5, "ae1260"),
  makeAlert("alert-3", "warning", "launch", "Launch Detected", "Possible rocket launch from mobile platform in Caspian Sea.", 8, "ll2-4"),
  makeAlert("alert-4", "critical", "ship", "AIS Dark Activity", "Four vessels switched AIS off near Malacca Strait.", 12, "345678903"),
  makeAlert("alert-5", "warning", "ship", "Naval Asset Concentration", "High concentration of naval assets near Taiwan Strait.", 15, "567890129"),
  makeAlert("alert-6", "info", "satellite", "Debris Field Reported", "ISS crew reports visual sighting of orbital debris.", 18, "25544"),
  makeAlert("alert-7", "warning", "aircraft", "Loitering Detected", "Three military tankers loitering near Korean Peninsula.", 22, "ae1235"),
  makeAlert("alert-8", "info", "launch", "Launch Window Scrub", "Rocket Lab Electron launch scrubbed due to winds.", 25, "ll2-7"),
  makeAlert("alert-9", "critical", "ship", "Surface Action Group", "Moskva-class cruiser departed Sevastopol with escorts.", 28, "678901234"),
  makeAlert("alert-10", "warning", "satellite", "Reconnaissance Reposition", "LACROSSE satellite repositioned over Eastern Europe.", 32, "43692"),
  makeAlert("alert-11", "info", "aircraft", "VIP Transport", "C-32 diplomatic shuttle departed Andrews AFB.", 35, "ae1286"),
  makeAlert("alert-12", "warning", "ship", "Carrier Operations", "PLAN carrier group conducting flight ops south of Okinawa.", 38, "567890129"),
];
