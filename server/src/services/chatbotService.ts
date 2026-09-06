import { logger } from '../config/logger.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const PU_TRANSIT_KNOWLEDGE = `
You are the 24/7 SafeRide PU Transit & Safety AI Assistant for Parul University (Waghodia Campus, Vadodara, Gujarat).
Key Campus & Transit Information:
1. Locations & Campus Zones:
   - Parul University Main Gate (Waghodia Road)
   - Parul Sevashram Hospital & Medical College (Emergency & Outpatient)
   - Academic Blocks: Faculty of Engineering, Management, Pharmacy, Applied Science
   - Hostels: Tagore Bhavan, Sarojini Bhavan, Kalam Bhavan, Mother Teresa Hostel
   - Central Library, Sports Complex, Food Court & Student Center
   - Vadodara Hubs: Vadodara Junction Railway Station (~18 km), Central Bus Stand (GSRTC ~17 km), Vadodara Airport (BDQ ~19 km), Sayaji Baug (~16 km).
2. Fares & Subsidies:
   - Within Campus & Geofenced Hostels: Free to ₹20.
   - Vadodara Railway Station / Central Bus Station: Subsidized institutional rate (approx ₹45 - ₹65 depending on route).
   - Airport Transit: Approx ₹80 - ₹120.
3. Safety & Driver Verification:
   - All drivers are background-verified and university registered.
   - Every ride generates a unique 4-digit Security PIN to share with the driver before boarding.
   - Real-time GPS tracking and campus geofencing monitored 24/7 by University Security.
   - Emergency SOS panic button dispatches live coordinates to the Central Security Desk (+91 2668 260300).
4. Payments:
   - Supports Razorpay Indian Gateway, UPI (Google Pay, PhonePe, Paytm), and Sandbox testing.
`;

export const processChatMessage = async (
  message: string,
  history: ChatMessage[] = []
): Promise<string> => {
  const lowerMsg = message.toLowerCase().trim();

  // If GEMINI_API_KEY is provided, attempt live Gemini API call
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${PU_TRANSIT_KNOWLEDGE}\n\nUser Question: ${message}\n\nProvide a helpful, polite, concise response with bullet points and emojis where helpful.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply;
      }
    } catch (err) {
      logger.warn('Gemini API call failed, using internal knowledge engine:', err);
    }
  }

  // Built-in 24/7 Intelligent Parul University Transit Expert Engine
  if (lowerMsg.includes('fare') || lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('charge')) {
    if (lowerMsg.includes('station') || lowerMsg.includes('railway') || lowerMsg.includes('bus')) {
      return `🚌 **Vadodara Station / Bus Stand Fare:**\n\n- The institutional subsidized fare between **Parul University Campus** and **Vadodara Railway Station / Central Bus Stand** is **₹45 - ₹55**.\n- Travel time is typically **25 - 35 minutes** depending on highway traffic.\n- Payments are accepted via UPI, Razorpay, or cash on arrival.`;
    }
    if (lowerMsg.includes('airport')) {
      return `✈️ **Vadodara Airport (BDQ) Transit Fare:**\n\n- Subsidized student/staff fare: **₹85 - ₹110**.\n- Estimated travel time: **30 - 40 minutes**.\n- We recommend scheduling 2 hours prior to departure.`;
    }
    return `💰 **SafeRide PU Subsidized Fare Guide:**\n\n- **Intra-Campus (Hostels to Academic Blocks):** Free / ₹15 nominal shuttle fee\n- **PU Campus ↔ Vadodara Railway Station:** ₹45\n- **PU Campus ↔ Central Bus Stand (GSRTC):** ₹45\n- **PU Campus ↔ Vadodara Airport:** ₹85\n\nAll fares include institutional safety insurance and 24/7 GPS monitoring!`;
  }

  if (lowerMsg.includes('book') || lowerMsg.includes('how to ride') || lowerMsg.includes('how do i')) {
    return `🚗 **How to Book a Safe Ride in 3 Easy Steps:**\n\n1. **Select Points:** Go to the **Campus Map** tab and pick your **Pickup** and **Dropoff** points.\n2. **Review Fare & Pay:** Click **"Book & Pay (Razorpay)"** to complete payment via UPI or Sandbox test checkout.\n3. **Live Driver Tracking:** Once confirmed, you will immediately see your **Driver Details (Name, Vehicle Plate)**, dynamic **Distance (km) & ETA (mins)**, and a **4-Digit PIN** to share upon pickup!`;
  }

  if (lowerMsg.includes('sos') || lowerMsg.includes('emergency') || lowerMsg.includes('police') || lowerMsg.includes('danger') || lowerMsg.includes('help')) {
    return `🚨 **EMERGENCY ASSISTANCE PROTOCOL:**\n\nIf you feel unsafe or in distress:\n1. Click the red **"🚨 SOS"** button at the top or bottom-left of the screen.\n2. Your live GPS coordinates will immediately transmit to the **Parul University Central Security Desk**.\n\n📞 **Immediate Helplines:**\n- **PU Security Control Room:** +91 2668 260300 (24/7)\n- **Parul Sevashram Hospital Ambulance:** +91 2668 260222\n- **National Emergency Helpline:** 112\n- **Women's Safety Police Helpline:** 1091`;
  }

  if (lowerMsg.includes('driver') || lowerMsg.includes('pin') || lowerMsg.includes('security')) {
    return `🛡️ **Driver Verification & Security Guidelines:**\n\n- Every SafeRide driver is background-checked and campus-authorized.\n- **Always verify the 4-Digit Security PIN** with your driver before getting in.\n- Check that the license plate matches the app (e.g. **GJ-06-PU-2026**).\n- Vehicles are equipped with live speed monitoring and geofence tracking.`;
  }

  if (lowerMsg.includes('timing') || lowerMsg.includes('time') || lowerMsg.includes('night') || lowerMsg.includes('schedule') || lowerMsg.includes('available')) {
    return `⏰ **Operating Hours & Night Escort Service:**\n\n- **Campus Shuttles:** Run continuously every 10–15 minutes between **6:30 AM and 10:30 PM**.\n- **Late Night Safety Escort:** Available **24/7** for students & faculty arriving from late trains/buses.\n- All night transits are escorted and monitored by security patrols along Waghodia Road.`;
  }

  if (lowerMsg.includes('hospital') || lowerMsg.includes('medical') || lowerMsg.includes('doctor') || lowerMsg.includes('sevashram')) {
    return `🏥 **Parul Sevashram Hospital & Medical Services:**\n\n- Located directly on the Waghodia Campus near Gate 2.\n- 24/7 Emergency trauma care & ambulance services available.\n- **Ambulance Direct Line:** +91 2668 260222.`;
  }

  if (lowerMsg.includes('hostel') || lowerMsg.includes('stay') || lowerMsg.includes('room')) {
    return `🏢 **Campus Hostels Covered by SafeRide:**\n\n- **Boys Hostels:** Tagore Bhavan, Kalam Bhavan, Shanti Bhavan\n- **Girls Hostels:** Sarojini Bhavan, Mother Teresa Bhavan, Indira Bhavan\n- SafeRide drops off directly at the secure gate of each hostel zone with warden check-in.`;
  }

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return `👋 **Hello! Welcome to SafeRide PU 24/7 AI Assistant.**\n\nI can help you with:\n- 📍 **Campus routes & locations**\n- 💰 **Subsidized fare calculations**\n- 🚗 **Booking safe rides & tracking your driver**\n- 🚨 **Emergency contacts & SOS protocols**\n\nHow can I help you today?`;
  }

  // Helpful Default Assistant Response
  return `🤖 **SafeRide PU Assistant:**\n\nI am here 24/7 to help you navigate Parul University campus transit safely.\n\n- To book a ride: Select your route on the **Campus Map** and click **Book & Pay**.\n- To check fares: Ask me *"What is the fare to Vadodara Station?"*\n- In case of emergency: Tap the **"🚨 SOS"** button or call **+91 2668 260300**.\n\nFeel free to ask any question about timings, drivers, or campus routes!`;
};
