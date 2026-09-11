import type { AiInsight } from "@/domain/entities";

const now = new Date();

function makeInsight(
  id: string,
  category: "loitering" | "dark" | "activity" | "formation" | "launch",
  title: string,
  description: string,
  minutesAgo: number,
  severity: "critical" | "warning" | "info"
): AiInsight {
  return {
    id,
    category,
    title,
    description,
    timestamp: new Date(now.getTime() - minutesAgo * 60 * 1000),
    severity,
  };
}

export const insights: AiInsight[] = [
  makeInsight("insight-1", "loitering", "Unusual Loitering Detected", "3 military aircraft loitering near Korean Peninsula for over 1.5 hours. Pattern suggests tanker drag or combat air patrol.", 5, "warning"),
  makeInsight("insight-2", "dark", "AIS Dark Activity", "4 vessels switched AIS off near Malacca Strait. Dark window averaged 23 minutes; one vessel altered course after reactivation.", 8, "critical"),
  makeInsight("insight-3", "activity", "Increased Air Activity", "27% increase in military flights in Eastern Mediterranean compared to 7-day baseline. Tanker sorties account for most of the delta.", 12, "info"),
  makeInsight("insight-4", "formation", "Unusual Formation", "5 aircraft in tight vic formation near Baltic region. Flight profiles consistent with NATO air policing reinforcement.", 15, "warning"),
  makeInsight("insight-5", "launch", "Launch Anomaly", "Thermal signature in Caspian Sea region does not match known launch sites. Possible mobile platform or offshore test.", 18, "critical"),
];
