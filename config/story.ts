import { BRAND_NAME } from "./site";

export interface DetailedStorySection {
  title: string;
  content: string[];
}

export interface Founder {
  id: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  image: string;
  artDirectionNote: string;
  linkedin?: string;
  location: string;
  storyTitle: string;
  storySubtitle: string;
  sections: DetailedStorySection[];
}

export interface TimelineEvent {
  period: string;
  title: string;
  description: string[];
  badge?: string;
  isKeyMilestone?: boolean;
}

export const storyData = {
  tagline: "AI Skin Telemetry + 15-Min Quick-Commerce Dark Store Delivery.",
  originCity: "Vijayawada & Visakhapatnam, Andhra Pradesh",
  originCountry: "India",

  eyebrow: "GLOW VAI QUICK-COMMERCE STARTUP STORY",
  headline: "Not just a skincare store: an AI-powered Quick-Commerce Dark Store network.",
  intro: "Glow VAI connects AI skin-check technology with hyperlocal micro-hubs (Dark Stores) in Vijayawada. From instant 30-second skin analysis to 15-minute doorstep cosmetic delivery.",
  problem: "Traditional skincare shopping requires guessing in supermarket aisles or waiting days for e-commerce deliveries. People spend fortunes on wrong products without knowing their actual skin metrics.",
  turn: "We built GLOW VAI to combine a quick camera skin check with delivery from partner stores in about 15 minutes.",
  origin: `${BRAND_NAME} began with three founders across Vijayawada, Visakhapatnam, and Hyderabad. What if your phone could analyse skin hydration and barrier depth in 30 seconds, and deliver a matched routine to your doorstep in about 15 minutes?`,
  howItWorks: "Your camera reads texture, hydration, tone and clarity. A partner store in Vijayawada packs the routine and a rider brings it to you.",
  mission: "Make choosing skincare simple and fast. A free skin scan, and your routine delivered in about 15 minutes where we cover.",
  cosmeticNote: "Cosmetic skin insights, not medical advice.",
  signoff: `Welcome to ${BRAND_NAME} Quick-Commerce.`,

  founders: [
    {
      id: "sardhar-musthafa",
      name: "SK Sardar Musthafa",
      role: "Founder (vision and direction)",
      tagline: "Set the direction and vision of bringing dermatological AI and skincare retail to everyday people.",
      bio: "Founder of GLOW VAI, leading vision and direction for AI skin analysis and skincare retail in India.",
      image: "/images/founders/sardhar-musthafa.jpeg",
      artDirectionNote: "SK Sardar Musthafa, founder of GLOW VAI.",
      location: "Vijayawada, Andhra Pradesh",
      storyTitle: "Sardar Musthafa: The Story of a Boy Who Decided to Build Something of His Own",
      storySubtitle: "2023-2026 | A story nobody saw completely.",
      sections: [
        {
          title: "2023-2024: Before the Dream Had a Name",
          content: [
            "Before Glowvai existed, before the website, before the title of founder, there was a young boy named Sardar Musthafa.",
            "In 2023 and 2024, he was learning ethical hacking, exploring technology, and trying to understand what he could make of his future.",
            "He wasn't someone who already had everything figured out. He was still learning, still exploring, and still trying to discover where he belonged.",
            "During that period, he became friends with Rehmit. Neither of them knew that a friendship formed during those years would eventually lead to a business idea that would change the direction of Sardar's life.",
            "He didn't have a company, an established team, investors, or a roadmap to success. He had curiosity, ambition, and an idea of the kind of life he wanted to build."
          ]
        },
        {
          title: "February 18, 2025: The Beginning of Glowvai",
          content: [
            "On February 18, 2025, Sardar visited Rehmit at his location. A conversation between two friends became the starting point of an idea in the beauty industry.",
            "Three days later, on February 21, they connected again to redefine the concept.",
            "At that moment, Glowvai was not a successful startup. It wasn't even a finished product. It was an idea that needed research, validation, technology, and people willing to work on it.",
            "Sardar only knew that he wanted to build something of his own. And he began."
          ]
        },
        {
          title: "March 2025: Searching for the Real Problem",
          content: [
            "Sardar and Rehmit started speaking with people to understand the problems in the beauty industry. They researched, asked questions, and refined their idea based on what they learned.",
            "The original concept evolved as they tried to understand what customers actually needed. But identifying a problem was only the beginning.",
            "Sardar was entering a world where having a good idea meant very little without the ability to execute it."
          ]
        },
        {
          title: "2025: The People Who Promised to Help",
          content: [
            "Building a startup without sufficient resources is difficult. Building one while depending on people who never deliver can be even harder.",
            "Sardar explored AI tools, experimented with different ways of building the product, and spent months researching the business. He also pursued investment opportunities.",
            "Some people made promises that never became reality. Time was spent following possibilities that ultimately led nowhere.",
            "Sardar had to learn a painful distinction: someone believing in an idea is not the same as someone being willing to work for it."
          ]
        },
        {
          title: "The Disrespect Nobody Puts in the Pitch Deck",
          content: [
            "People see a founder's announcement. They see a logo, a website, a title, and sometimes a launch post. They rarely see the person behind those things when there is nothing impressive to show.",
            "Sardar's path included the frustration of trying to find people willing to take his work seriously, dealing with people who did not follow through, and facing situations in which support wasn't there.",
            "The hardest truth was that the work still had to be done, even when the expected support never arrived."
          ]
        },
        {
          title: "November 2025: Building Beyond the Startup & Public Announcement",
          content: [
            "Around November 12 to 20, Sardar began creating content around startups and entrepreneurship. On November 20, 2025, Glowvai's public announcement marked another step.",
            "The project that had started with private conversations was now something people could discover publicly. Sardar now had to make Glowvai more than an idea with a name. He needed a product."
          ]
        },
        {
          title: "December 2025: A Door Opens",
          content: [
            "In December 2025, Work Wizards Innovations connected with Glowvai. With support from the organization and its team, including Venkat, Sardar had an opportunity to move closer to building the first version."
          ]
        },
        {
          title: "January 1, 2026: Proof That the Idea Could Become Real (V1 Launch)",
          content: [
            "On January 1, 2026, Glowvai V1 went live with AI-powered face analysis.",
            "During an early period, Glowvai recorded more than 600 website visitors and approximately 300 skin analyses tracked by Sardar.",
            "The idea that began with a conversation in February 2025 had become a real digital product."
          ]
        },
        {
          title: "2026: Controlling Ambition & Navigating the V2 Trap",
          content: [
            "After launching V1, Sardar envisioned a broader beauty platform combining AI personalization, quick commerce, nearby beauty vendors, and 15-minute delivery.",
            "However, expanding features before proving core retention created delays. He learned that building a company is not about adding everything imaginable, but proving what matters most."
          ]
        },
        {
          title: "September 15, 2026: A New Chapter with Satvik",
          content: [
            "On September 15, 2026, Sardar reconnected with Satvik, an online Instagram connection who joined as Co-Founder & Technology Partner.",
            "With Satvik in Visakhapatnam, Sardar in Vijayawada, and Rehmit in Vijayawada, GLOW VAI gained the relentless technical execution needed to build a real quick-commerce platform."
          ]
        },
        {
          title: "October 2026: Still Here, Still Building",
          content: [
            "By October 2026, Sardar has experienced the full startup cycle: research, public launch, V1 traction, V2 scope traps, team lessons, and technical partnership.",
            "The story is still being written, focused on execution, customer trust, and 15-minute dark store delivery value."
          ]
        }
      ]
    },
    {
      id: "rahimath",
      name: "Rehmit",
      role: "Marketing Lead & Market Explorer",
      tagline: "Understands what customers need and connects the brand with the people who need it.",
      bio: "Founding partner who ignited the first Glow VAI conversation in February 2025. Leads customer research and market expansion.",
      image: "/images/founders/rahimath.jpeg",
      artDirectionNote: "Rehmit, Marketing Lead & Market Explorer.",
      location: "Hyderabad & Vijayawada, Andhra Pradesh",
      storyTitle: "Rehmit: The Story of a Friend Who Became Part of a Startup Build",
      storySubtitle: "2023-2026 | Friendship, ambition, setbacks, and the unfinished dream of Glowvai.",
      sections: [
        {
          title: "2023-2024: Before Glowvai Existed",
          content: [
            "Before Glowvai became a startup, before the website and plans for a beauty-tech platform, there was a friendship.",
            "Rehmit and Sardar Musthafa became friends while Sardar was learning ethical hacking during 2023-2024.",
            "There were simply two people who knew each other, each with a life and future still taking shape."
          ]
        },
        {
          title: "February 18, 2025: The Conversation That Started Glowvai",
          content: [
            "On February 18, 2025, Sardar visited Rehmit at his location. During their meeting, they discussed an idea in the beauty industry.",
            "Three days later, on February 21, they connected again to redefine the concept. Those early discussions turned a casual possibility into a serious startup exploration."
          ]
        },
        {
          title: "March 2025: Looking Beyond the Original Idea",
          content: [
            "During March, Rehmit and Sardar spoke with multiple people to understand challenges in the beauty industry.",
            "They used these customer conversations to refine and pivot their original concept based on real skin frustrations."
          ]
        },
        {
          title: "2025: The Long Road Before the First Product",
          content: [
            "The team experimented with AI tools, researched business models, and navigated investor discussions that did not materialize.",
            "Glowvai had to keep moving despite uncertainty and resource constraints."
          ]
        },
        {
          title: "November 2025 to January 1, 2026: Public Launch & V1",
          content: [
            "In November 2025, Glowvai was publicly announced. With Work Wizards Innovations connecting in December, Glowvai V1 launched on January 1, 2026.",
            "Over 600 visitors and 300 skin scans tested the initial platform."
          ]
        },
        {
          title: "2026: Quick Commerce Expansion & Market Growth",
          content: [
            "Rehmit continues leading market exploration, expanding Glow VAI's reach from skin checks into Vijayawada hyperlocal dark store delivery and partner referral programs.",
            "The story proves that building a lasting business requires relentless customer focus."
          ]
        }
      ]
    },
    {
      id: "nalla-satvik",
      name: "Nalla Satvik",
      role: "Co-Founder & Technical Lead",
      tagline: "Builds high-speed AI skin analysis telemetry and web infrastructure.",
      bio: "Co-Founder & Technical Lead at GLOW VAI, building high-speed AI skin analysis telemetry and web infrastructure.",
      image: "/images/founders/nalla-satvik.jpg",
      artDirectionNote: "Nalla Satvik, Co-Founder & Technical Lead at GLOW VAI.",
      location: "Visakhapatnam, Andhra Pradesh",
      storyTitle: "Nalla Satvik: A Story of Curiosity, Creativity, and Relentless Ambition",
      storySubtitle: "From programming and software development to AI systems and Co-Founder & Technical Lead at GLOW VAI.",
      sections: [
        {
          title: "A Story of Curiosity, Creativity, and Relentless Ambition",
          content: [
            "The path of Nalla Satvik is the story of a young dreamer who refuses to limit himself to a single identity. From exploring the world of programming and game development to building AI-powered applications, experimenting with entrepreneurship, and pursuing opportunities in the technology industry, Satvik represents a generation that wants to do more than simply follow a conventional career path. He wants to create, innovate, and build something of his own.",
            "As a B.Tech student specializing in computer science and emerging technologies, Satvik began developing his technical skills through curiosity and experimentation. Programming was not merely a subject to study; it became a way to turn ideas into working things. He explored Python, web development, artificial intelligence and software engineering, and kept looking for ways to learn beyond the classroom."
          ]
        },
        {
          title: "Game Development & 7WeekStudios",
          content: [
            "One of his strongest interests has been game development. With experience in Unity and C#, Satvik explored how ideas could become interactive experiences. His ambition led to the creation of 7WeekStudios, his independent game development identity. Through this work, he began understanding the challenges of building games, designing user interfaces, implementing mechanics, and turning creative concepts into products people might enjoy.",
            "But his ambitions extended beyond gaming. Satvik ventured into full-stack web development, automation, AI integrations, and digital entrepreneurship. He explored technologies such as React, Next.js, TypeScript, and Python while working on projects designed to solve practical problems. His work reflects an interest in combining technical ability with creativity, especially through applications that integrate intelligent systems with useful everyday experiences."
          ]
        },
        {
          title: "Artificial Intelligence & Zerina AI",
          content: [
            "Artificial intelligence became another important chapter in his story. Rather than treating AI as just another trend, Satvik explored how it could power assistants, automate repetitive tasks, analyze information, and improve digital products. Projects such as Zerina AI, his envisioned intelligent assistant, demonstrate his interest in creating systems that go beyond simple interfaces and help people accomplish meaningful tasks."
          ]
        },
        {
          title: "The Reality of Entrepreneurship & Technical Growth",
          content: [
            "Entrepreneurship, however, introduced a different reality. Building something valuable requires more than writing code. Finding clients, marketing products, earning trust, managing expectations, and generating consistent revenue can be difficult. Satvik experienced setbacks while exploring freelancing, digital products, and monetization. Not every project produced the results he hoped for, and some experiences brought financial pressure and uncertainty.",
            "Yet these challenges became part of his education. They revealed the difference between having an idea and building a sustainable business. They also reinforced the importance of practical execution, understanding customers, validating demand, and developing skills that translate into real opportunities.",
            "Alongside his entrepreneurial ambitions, Satvik continued pursuing professional growth. Preparing for technical assessments and interviews pushed him to strengthen his knowledge of Python, SQL, cloud technologies, generative AI, and problem-solving. Balancing academics, projects, and career preparation demanded persistence, particularly when confidence did not always match ambition."
          ]
        },
        {
          title: "Joining Glow VAI & Building the Future",
          content: [
            "On September 15, 2026, Satvik reconnected with Sardar Musthafa and joined Glow VAI as Co-Founder and Technical Lead. Bringing his deep experience in Next.js, React, Python, and AI systems, Satvik took charge of building the high-speed AI skin telemetry engine, scanning algorithms, and quick-commerce dark store infrastructure.",
            "What makes Satvik's path meaningful is not the number of technologies he has explored or projects he has imagined. It is his willingness to keep learning across different fields, confront unfamiliar challenges, and search for ways to turn his abilities into something valuable.",
            "His story is still unfolding. He is simultaneously a student, developer, aspiring entrepreneur, and independent creator, learning how to turn ambition into steady progress. Nalla Satvik's story is not about having everything figured out. It is about building the person capable of achieving what he dreams of. Every experiment, unsuccessful attempt, new skill, and completed project contributes to that process.",
            "His ultimate goal is to move beyond merely learning technology and become someone who uses it to build meaningful products, create opportunities, and establish an independent identity in the digital world. The story continues, and the most important chapter may still be ahead."
          ]
        }
      ]
    }
  ] as Founder[],

  timeline: [
    {
      period: "2023-2024",
      title: "Before Glowvai: Where the Story Began",
      description: [
        "Sardar Musthafa was learning ethical hacking and exploring technology in Vijayawada.",
        "Met Rehmit; a strong friendship formed before any business idea existed."
      ],
      badge: "ORIGIN & LEARNING"
    },
    {
      period: "Feb 18, 2025",
      title: "The First Conversation (The Spark)",
      description: [
        "Sardar visited Rehmit at his location.",
        "What began as a casual chat turned into the founding idea for a beauty-tech startup."
      ],
      badge: "FOUNDING MOMENT",
      isKeyMilestone: true
    },
    {
      period: "Feb 21, 2025",
      title: "Redefining the Idea",
      description: [
        "3 days later, Sardar & Rehmit re-engaged to define what problem Glowvai would solve.",
        "Identified customer frustrations in finding suitable skincare routines."
      ],
      badge: "CONCEPT DEFINITION"
    },
    {
      period: "March 2025",
      title: "Listening to the Beauty Industry",
      description: [
        "Conducted in-depth interviews with potential users regarding skincare confusion.",
        "Shifted focus from simply having a business idea to solving real consumer pain points."
      ],
      badge: "USER RESEARCH"
    },
    {
      period: "Mar-Oct 2025",
      title: "Experimentation, Research & Hard Lessons",
      description: [
        "Explored AI tools, Amazon infrastructure, and business models.",
        "Navigated unfulfilled investor promises, learning the critical difference between talk and execution."
      ],
      badge: "RESEARCH & PIVOTS"
    },
    {
      period: "Nov 12-20, 2025",
      title: "Building in Public",
      description: [
        "Sardar began sharing startup story content online.",
        "On Nov 20, 2025, Glowvai was officially announced to the public."
      ],
      badge: "PUBLIC ANNOUNCEMENT",
      isKeyMilestone: true
    },
    {
      period: "Dec 2025",
      title: "Work Wizards Innovations Partnership",
      description: [
        "Work Wizards Innovations (Venkat & team) collaborated with Glowvai.",
        "Transitioned the concept into a tangible web product."
      ],
      badge: "TECH COLLABORATION"
    },
    {
      period: "Jan 1, 2026",
      title: "Glowvai V1 Goes Live",
      description: [
        "Launched AI-powered face & skin analysis experience.",
        "Achieved 600+ website visitors and 300+ completed skin scans."
      ],
      badge: "V1 LAUNCH",
      isKeyMilestone: true
    },
    {
      period: "Early-Mid 2026",
      title: "The V2 Trap & Quick-Commerce Blueprint",
      description: [
        "Expanded vision into AI personalization + Hyperlocal Dark Store fulfillment.",
        "Learned that a startup succeeds by solving the right problem well, not by adding bloated features."
      ],
      badge: "QUICK-COMMERCE SHIFT"
    },
    {
      period: "Sep 15, 2026",
      title: "A New Chapter: Satvik Joins as Co-Founder & Technical Lead",
      description: [
        "Nalla Satvik (B.Tech, Visakhapatnam) reconnected with Sardar & Rehmit.",
        "Brought intense engineering speed and execution discipline to Glow VAI."
      ],
      badge: "TECHNICAL LEADERSHIP",
      isKeyMilestone: true
    },
    {
      period: "Oct 2026 to Present",
      title: "Building the AI Quick-Commerce Dark Store Network",
      description: [
        "Operating 15-minute express delivery micro-hubs in Vijayawada.",
        "Combining AI skin checks with direct doorstep fulfillment."
      ],
      badge: "LIVE TODAY",
      isKeyMilestone: true
    }
  ] as TimelineEvent[]
};
