import type { JournalArticle } from "../journal";

export const faceScanHonest: JournalArticle = {
  id: "what-a-face-scan-can-and-cannot-tell-you",
  slug: "what-a-face-scan-can-and-cannot-tell-you",
  title: "What a Skin Scan Can and Cannot Tell You",
  description: "A phone skin scan can mark spots and estimate oiliness or redness from a photo. It cannot diagnose. Learn what it is good for, where it goes wrong, and how to get a better photo.",
  category: "Skin Basics",
  readTime: "5 min read",
  excerpt: "A face scan looks at a photo, not at your skin under the surface. Here is a plain look at what it can do, what it gets wrong, and how to use it well.",
  imageSlot: "/images/face-analysis/camera_scan.png",
  author: { name: "GLOW VAI Editorial Team", role: "Skincare education, GLOW VAI" },
  datePublished: "2026-11-28",
  dateModified: "2026-11-28",
  status: "published",
  keywords: ["skin analysis app", "face scan skin check", "AI skin analysis accuracy", "is skin scan app accurate"],
  related: ["pimples-home-care-or-dermatologist", "sunscreen-india-how-much-how-often"],
  summary: "A skin scan reads a photo. It can mark visible spots and give rough estimates, but it cannot diagnose a skin condition, and it can miss small spots or mark things that are not spots. Use it to track changes, and see a dermatologist for anything painful, bleeding or changing.",
  sections: [
    {
      heading: "What a scan actually does",
      paragraphs: [
        "A skin scan takes a photo of your face and looks for things you can see: pimples, dark spots, texture, redness, shine and dark circles under the eyes. It then marks the places it found them, and gives rough estimates for things like oiliness.",
        "It looks only at the surface in one photo. It does not know your medical history, what you eat, your hormones or what you put on your skin last week.",
      ],
    },
    {
      heading: "What it cannot do",
      paragraphs: [
        "A scan cannot diagnose a skin condition. It cannot tell eczema from a fungal infection, check a mole, or say why a spot has appeared. Only a doctor who can examine you can do that.",
        "Our own scan says so on the result screen: the numbers are labelled 'Estimated, not validated', and the result is a visual check, not a medical diagnosis.",
      ],
    },
    {
      heading: "Where scans go wrong",
      paragraphs: [
        "Any photo-based tool makes mistakes. Common ones are:",
      ],
      listItems: [
        "It can miss small or faint spots, especially when they are the same colour as the skin around them.",
        "It can mark something that is not a spot, such as a pore, a shadow, a hair or the edge of a beard.",
        "Dim or yellow light, a blurry photo, make-up, filters and glasses all change the result.",
        "Skin tone, facial hair and the angle of the phone can change what the camera sees.",
      ],
    },
    {
      heading: "How to get a better scan",
      paragraphs: [
        "Most of the difference comes from the photo, not the app. The steps are simple:",
      ],
      listItems: [
        "Stand in daylight, facing a window or the sun, not with it behind you.",
        "Take off glasses and move hair off your face.",
        "Hold the phone at eye level, about an arm's length away, and keep your face in the oval.",
        "Stay still while the countdown runs.",
      ],
      figure: {
        src: "/images/face-analysis/camera_scan.png",
        alt: "A phone showing the GLOW VAI face scan with the face inside an oval",
        caption: "Good light and a steady phone matter more than anything else.",
      },
    },
    {
      heading: "How to use a scan well",
      paragraphs: [
        "A scan is most useful as a diary. Take it in the same place, in the same light, once a week, and compare. A single result matters less than the direction over a few weeks.",
        "If a scan marks something that is not there, or misses a spot you can see, you can say so on the result screen in the app. That feedback helps us improve the scan.",
        "See a dermatologist for anything that is painful, bleeding, growing, or a mole that is changing, whatever the scan says.",
      ],
    },
    {
      heading: "What happens to your photo",
      paragraphs: [
        "Your scan is saved only if you say yes. Saved scans are kept privately and are not shown to other users. If you want your scan back, or deleted, ask our support team and we will do it.",
        "The scan runs in the GLOW VAI app. You can learn more on the [face scan page](/face-analysis).",
      ],
    },
  ],
  faq: [
    { q: "Can a skin scan app diagnose a skin condition?", a: "No. It reads a photo and can mark visible spots and give rough estimates. A diagnosis needs a doctor who can examine your skin." },
    { q: "How accurate is a skin scan?", a: "It depends a lot on the photo. It can miss small or faint spots and can mark things that are not spots. Treat the result as an estimate, and use good light." },
    { q: "How can I get a better skin scan result?", a: "Use daylight facing the light, remove glasses, keep hair off your face, hold the phone at eye level about an arm's length away, and stay still." },
  ],
};
