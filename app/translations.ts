export type Language = 'en' | 'te';

export interface TranslationStructure {
  nav: {
    features: string;
    pricing: string;
    whyUs: string;
    login: string;
    startFree: string;
  };
  hero: {
    title1: string;
    title2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    tags: {
      free: string;
      gst: string;
      setup: string;
      mobile: string;
    };
  };
  painPoints: {
    title: string;
    items: {
      emoji: string;
      title: string;
      desc: string;
    }[];
  };
  features: {
    title: string;
    subtitle: string;
    items: {
      title: string;
      desc: string;
    }[];
  };
  howItWorks: {
    title: string;
    time: string;
    desc: string;
    steps: {
      title: string;
      desc: string;
    }[];
  };
  pricing: {
    title: string;
    plans: {
      free: {
        name: string;
        price: string;
        desc: string;
        cta: string;
      };
      pro: {
        name: string;
        price: string;
        desc: string;
        cta: string;
      };
      business: {
        name: string;
        price: string;
        desc: string;
        cta: string;
      };
    };
    gstIncluded: string;
  };
  whatsapp: {
    tooltip: string;
    prefixedMessage: string;
  };
}

export const translations: Record<Language, TranslationStructure> = {
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      whyUs: "Why Us",
      login: "Login",
      startFree: "Start Free"
    },
    hero: {
      title1: "Your Print Shop Deserves",
      title2: "Better Than WhatsApp Notes",
      subtitle: "PrintFlow helps small printing businesses in India track orders, generate GST invoices, manage customers, and grow — all from your phone. Free to start.",
      ctaPrimary: "Start Free — No Credit Card",
      ctaSecondary: "See How It Works",
      tags: {
        free: "Free forever",
        gst: "GST invoices",
        setup: "Setup in 5 minutes",
        mobile: "Works on any phone"
      }
    },
    painPoints: {
        title: "Sound familiar?",
        items: [
            {
                emoji: "😩",
                title: "Orders lost in WhatsApp chats",
                desc: "You get 20 orders on WhatsApp. Three customers call asking where their job is. You have no idea which message to look for."
            },
            {
                emoji: "📋",
                title: "Writing invoices on paper",
                desc: "You spend 20 minutes writing each bill by hand. GST calculations are wrong sometimes. Customers want digital receipts but you can't send them."
            },
            {
                emoji: "💸",
                title: "Customers who haven't paid",
                desc: "You finished the job. They said they'll pay later. Now you have ₹40,000 outstanding and no system to track who owes what."
            }
        ]
    },
    features: {
      title: "Everything your print shop needs",
      subtitle: "Built specifically for Indian printing businesses — not a generic tool adapted for you",
      items: [
        {
          title: "Order Tracking",
          desc: "Create and track every job from received to delivered. Never lose an order again."
        },
        {
          title: "GST Invoices",
          desc: "Auto-generate GST-compliant invoices with CGST, SGST, and IGST. Sequential invoice numbers. Print or share instantly."
        },
        {
          title: "WhatsApp Notifications",
          desc: "One tap sends your customer a message: 'Your order is ready. Balance due: ₹500.' No typing needed."
        },
        {
          title: "Customer Ledger",
          desc: "See every customer's full order history and outstanding balance at a glance."
        },
        {
          title: "Online Order Form",
          desc: "Share your own link — customers fill their order details and upload files. It lands directly in your dashboard."
        },
        {
          title: "Business Dashboard",
          desc: "Today's orders, this month's revenue, pending jobs, top customers. Your business at a glance."
        }
      ]
    },
    howItWorks: {
        title: "Up and running in",
        time: "5 minutes",
        desc: "We've removed the friction. No long sales calls, no complex setups. Just sign up and start.",
        steps: [
            {
                title: "Sign up free",
                desc: "Enter your business name and email. No credit card required. No demo call needed."
            },
            {
                title: "Set up your shop",
                desc: "Add your job types, prices, and GST number. Setup takes less than 3 minutes."
            },
            {
                title: "Manage orders",
                desc: "Create your first order and share the job details instantly via WhatsApp."
            }
        ]
    },
    pricing: {
        title: "Start free. Upgrade when you grow.",
        plans: {
            free: {
                name: "FREE",
                price: "₹0",
                desc: "Perfect for small shops just getting started",
                cta: "Start Free"
            },
            pro: {
                name: "PRO",
                price: "₹499",
                desc: "For growing print shops",
                cta: "Start Pro Trial"
            },
            business: {
                name: "BUSINESS",
                price: "₹999",
                desc: "For large print shops and chains",
                cta: "Contact Us"
            }
        },
        gstIncluded: "All plans include GST invoicing. No setup fees. Cancel anytime."
    },
    whatsapp: {
        tooltip: "Need help? Chat with us",
        prefixedMessage: "Hi, I'm interested in PrintFlow for my print shop. Can you help me get started?"
    }
  },
  te: {
    nav: {
      features: "ఫీచర్స్",
      pricing: "ధరలు",
      whyUs: "ఎందుకు మేము?",
      login: "లాగిన్",
      startFree: "ఉచితంగా ప్రారంభించండి"
    },
    hero: {
      title1: "మీ ప్రింట్ షాప్",
      title2: "వాట్సాప్ నోట్స్ కంటే మెరుగ్గా ఉండటానికి అర్హమైనది",
      subtitle: "ప్రింట్ ఫ్లో భారతదేశంలోని చిన్న ప్రింటింగ్ వ్యాపారాలకు ఆర్డర్లను ట్రాక్ చేయడానికి, GST ఇన్వాయిస్లను తయారు చేయడానికి, కస్టమర్లను నిర్వహించడానికి మరియు మీ ఫోన్ నుండి వ్యాపారాన్ని పెంచుకోవడానికి సహాయపడుతుంది. ప్రారంభించడం ఉచితం.",
      ctaPrimary: "ఉచితంగా ప్రారంభించండి — క్రెడిట్ కార్డ్ అవసరం లేదు",
      ctaSecondary: "ఇది ఎలా పనిచేస్తుందో చూడండి",
      tags: {
        free: "ఎప్పటికీ ఉచితం",
        gst: "GST ఇన్వాయిస్లు",
        setup: "5 నిమిషాల్లో సెటప్",
        mobile: "ఏ ఫోన్ లోనైనా పనిచేస్తుంది"
      }
    },
    painPoints: {
        title: "ఇది మీకు తెలుసా?",
        items: [
            {
                emoji: "😩",
                title: "వాట్సాప్ చాట్లలో పోయిన ఆర్డర్లు",
                desc: "మీకు వాట్సాప్‌లో 20 ఆర్డర్లు వస్తాయి. ముగ్గురు కస్టమర్లు తమ పని ఎక్కడ ఉందని అడుగుతారు. ఏ మెసేజ్ చూడాలో మీకు అర్థం కాదు."
            },
            {
                emoji: "📋",
                title: "కాగితంపై ఇన్వాయిస్లు రాయడం",
                desc: "మీరు ప్రతి బిల్లును చేతితో రాయడానికి 20 నిమిషాలు గడుపుతారు. GST లెక్కలు కొన్నిసార్లు తప్పుగా ఉంటాయి. కస్టమర్లు డిజిటల్ రసీదులు కోరుకుంటారు కానీ మీరు పంపలేరు."
            },
            {
                emoji: "💸",
                title: "డబ్బులు చెల్లించని కస్టమర్లు",
                desc: "మీరు పని పూర్తి చేసారు. వారు తర్వాత చెల్లిస్తామని చెప్పారు. ఇప్పుడు మీకు ₹40,000 రావాల్సి ఉంది మరియు ఎవరు ఎంత బాకీ ఉన్నారో ట్రాక్ చేయడానికి మీ దగ్గర వ్యవస్థ లేదు."
            }
        ]
    },
    features: {
      title: "మీ ప్రింట్ షాప్‌కు కావాల్సినవన్నీ",
      subtitle: "భారతీయ ప్రింటింగ్ వ్యాపారాల కోసం ప్రత్యేకంగా నిర్మించబడింది",
      items: [
        {
          title: "ఆర్డర్ ట్రాకింగ్",
          desc: "ఆర్డర్ వచ్చినప్పటి నుండి డెలివరీ చేసే వరకు ప్రతి పనిని ట్రాక్ చేయండి. ఏ ఆర్డర్‌ను మర్చిపోవద్దు."
        },
        {
          title: "GST ఇన్వాయిస్లు",
          desc: "CGST, SGST మరియు IGST తో GST-కంప్లైంట్ ఇన్వాయిస్లను ఆటోమేటిక్‌గా తయారు చేయండి. ప్రింట్ చేయండి లేదా తక్షణమే షేర్ చేయండి."
        },
        {
          title: "వాట్సాప్ నోటిఫికేషన్లు",
          desc: "ఒక్క ట్యాప్‌తో మీ కస్టమర్‌కు మెసేజ్ పంపండి: 'మీ ఆర్డర్ సిద్ధంగా ఉంది. బ్యాలెన్స్: ₹500.' టైపింగ్ అవసరం లేదు."
        },
        {
          title: "కస్టమర్ లెడ్జర్",
          desc: "ప్రతి కస్టమర్ పూర్తి ఆర్డర్ హిస్టరీ మరియు బాకీ ఉన్న బ్యాలెన్స్‌ను ఒక్క చూపులో చూడండి."
        },
        {
          title: "ఆన్‌లైన్ ఆర్డర్ ఫారమ్",
          desc: "మీ స్వంత లింక్‌ను షేర్ చేయండి — కస్టమర్లు తమ ఆర్డర్ వివరాలను పూరిస్తారు మరియు ఫైళ్ళను అప్‌లోడ్ చేస్తారు."
        },
        {
          title: "బిజినెస్ డ్యాష్‌బోర్డ్",
          desc: "నేటి ఆర్డర్లు, ఈ నెల ఆదాయం, పెండింగ్ పనులు. మీ వ్యాపారం ఒక్క చూపులో."
        }
      ]
    },
    howItWorks: {
        title: "ప్రారంభించడానికి కేవలం",
        time: "5 నిమిషాలు",
        desc: "మేము ప్రక్రియను సులభతరం చేసాము. పెద్ద కాల్స్ లేవు, క్లిష్టమైన సెటప్‌లు లేవు. కేవలం సైన్ అప్ చేసి ప్రారంభించండి.",
        steps: [
            {
                title: "ఉచితంగా సైన్ అప్ చేయండి",
                desc: "మీ వ్యాపార పేరు మరియు ఈమెయిల్ నమోదు చేయండి. క్రెడిట్ కార్డ్ అవసరం లేదు."
            },
            {
                title: "మీ షాప్‌ను సెటప్ చేయండి",
                desc: "మీ పని రకాలు, ధరలు మరియు GST నంబర్‌ను జోడించండి. 3 నిమిషాల కంటే తక్కువ సమయం పడుతుంది."
            },
            {
                title: "ఆర్డర్లను నిర్వహించండి",
                desc: "మీ మొదటి ఆర్డర్‌ను సృష్టించండి మరియు వాట్సాప్ ద్వారా తక్షణమే వివరాలను షేర్ చేయండి."
            }
        ]
    },
    pricing: {
        title: "ఉచితంగా ప్రారంభించండి. పెరిగినప్పుడు అప్‌గ్రేడ్ చేయండి.",
        plans: {
            free: {
                name: "FREE",
                price: "₹0",
                desc: "మొదలు పెడుతున్న చిన్న షాపుల కోసం సరైనది",
                cta: "ఉచితంగా ప్రారంభించండి"
            },
            pro: {
                name: "PRO",
                price: "₹499",
                desc: "పెరుగుతున్న ప్రింట్ షాపుల కోసం",
                cta: "PRO ట్రయల్ ప్రారంభించండి"
            },
            business: {
                name: "BUSINESS",
                price: "₹999",
                desc: "పెద్ద ప్రింట్ షాపులు మరియు చైన్ల కోసం",
                cta: "మమ్మల్ని సంప్రదించండి"
            }
        },
        gstIncluded: "అన్ని ప్లాన్లలో GST ఇన్వాయిసింగ్ ఉంటుంది. ఎలాంటి సెటప్ ఫీజు లేదు. ఎప్పుడైనా క్యాన్సల్ చేయవచ్చు."
    },
    whatsapp: {
        tooltip: "సహాయం కావాలా? మాతో చాట్ చేయండి",
        prefixedMessage: "నమస్కారం, నా ప్రింట్ షాప్ కోసం ప్రింట్ ఫ్లో ఉపయోగించాలనుకుంటున్నాను. ప్రారంభించడానికి నాకు సహాయం చేస్తారా?"
    }
  }
};
