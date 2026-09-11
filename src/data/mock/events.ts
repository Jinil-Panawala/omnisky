import type { TimelineEvent } from "@/domain/entities";

const now = new Date();

function makeEvent(
  minutesAgo: number,
  type: "aircraft" | "ship" | "satellite" | "launch" | "alert",
  entityId: string,
  title: string,
  description: string
): TimelineEvent {
  return {
    id: `evt-${minutesAgo}`,
    timestamp: new Date(now.getTime() - minutesAgo * 60 * 1000),
    type,
    entityId,
    title,
    description,
    bookmarked: Math.random() > 0.7,
  };
}

export const events: TimelineEvent[] = [
  makeEvent(2, "aircraft", "ae1234", "Military tanker RCH9041 detected near Eastern Mediterranean", "Tanker operating in high-traffic corridor, altitude FL330."),
  makeEvent(5, "ship", "234567890", "AIS signal lost from vessel near Malacca Strait", "Container ship ceased transponder broadcast for 12 minutes."),
  makeEvent(8, "launch", "ll2-4", "Possible missile launch detected, Caspian Sea region", "Thermal signature consistent with solid-fuel booster."),
  makeEvent(12, "satellite", "39232", "Satellite KH-11 overpass over North Korea", "Optical reconnaissance window aligns with known test facility."),
  makeEvent(15, "alert", "alert-5", "High concentration of naval assets detected near Taiwan Strait", "Three carrier groups and fifteen escorts within 200 NM."),
  makeEvent(18, "aircraft", "ae1240", "RC-135 observed along DMZ flight path", "Signals intelligence mission tracking north-south racetrack."),
  makeEvent(22, "ship", "567890129", "PLAN carrier group observed south of Okinawa", "Liaoning and escorts conducting flight operations."),
  makeEvent(25, "aircraft", "ae1260", "F-35A flight activity increased over Baltic states", "NATO air policing sorties up 40% vs 7-day average."),
  makeEvent(28, "ship", "456789017", "HMS Queen Elizabeth enters North Sea exercise area", "Carrier strike group joined by Dutch and Belgian frigates."),
  makeEvent(32, "satellite", "43692", "LACROSSE radar reconnaissance satellite repositioned", "New ground track covers Eastern European conflict zone."),
  makeEvent(35, "launch", "ll2-1", "SpaceX Falcon 9 launch window opens", "Starlink deployment from Cape Canaveral."),
  makeEvent(38, "alert", "alert-1", "Restricted airspace breach near R-4807", "Military aircraft entered restricted zone without clearance."),
  makeEvent(42, "ship", "678901234", "Moskva-class cruiser departs Sevastopol", "Surface action group heading southwest into Black Sea."),
  makeEvent(45, "aircraft", "ae1280", "F-16C flight activity near Syrian border", "Coalition sorties increased after reported drone incident."),
  makeEvent(48, "satellite", "37849", "SBIRS missile warning satellite reports heat flash", "Transient event in central Pacific, likely launch test."),
  makeEvent(52, "ship", "890123456", "USNS Mercy hospital ship departs San Diego", "Humanitarian assistance deployment to Southeast Asia."),
  makeEvent(55, "aircraft", "ae1286", "C-32 VIP transport departs Andrews AFB", "Diplomatic shuttle to European capitals."),
  makeEvent(58, "launch", "ll2-7", "Rocket Lab Electron launch scrubbed", "Upper-level winds exceeded constraints."),
  makeEvent(62, "alert", "alert-2", "Unusual loitering detected near Korean Peninsula", "Three military tankers orbiting for over 1.5 hours."),
  makeEvent(65, "ship", "345678903", "Dark vessel reported in Persian Gulf", "Tanker with spoofed AIS heading toward Iranian waters."),
  makeEvent(68, "aircraft", "ae1254", "E-8 JSTARS active over Eastern Europe", "Ground surveillance mission tracking armored movements."),
  makeEvent(72, "satellite", "25544", "ISS crew reports visual sighting of debris field", "Fragmentation event suspected in low Earth orbit."),
  makeEvent(75, "ship", "234567893", "USS Carl Vinson strike group enters Gulf of Aden", "Counter-piracy and maritime security patrol."),
  makeEvent(78, "aircraft", "ae1236", "F-15E STRIKE package transits Saudi Arabia", "Escort mission for tanker traffic through Red Sea."),
  makeEvent(82, "launch", "ll2-3", "NASA SLS wet dress rehearsal delayed", "Ground systems issue at LC-39B."),
  makeEvent(85, "alert", "alert-3", "AIS dark activity in Malacca Strait", "Four vessels switched AIS off near traffic separation scheme."),
  makeEvent(88, "ship", "890123458", "JS Izumo departs Yokosuka", "Helicopter carrier conducting Indo-Pacific patrol."),
  makeEvent(92, "aircraft", "ae1247", "VULCAN03 and flight of four over Mediterranean", "French Air Force exercise with tanker support."),
  makeEvent(95, "satellite", "41308", "SBIRS GEO-2 anomaly resolved", "Infrared sensor returned to normal operations."),
  makeEvent(98, "ship", "789012345", "Russian Baltic Fleet sortie", "Three destroyers and a frigate departed Baltiysk."),
];
