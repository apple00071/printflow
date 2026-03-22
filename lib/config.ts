export const PRESS_CONFIG = {
    name: "Apple Graphics",
    tagline: "Quality Printing in Chirala",
    phone: "+91 XXXXXXXXXX",
    whatsapp: "91XXXXXXXXXX", // no + sign for wa.me links
    address: "Your Address, Chirala, Andhra Pradesh",
    city: "Chirala",
    state: "Andhra Pradesh",
    email: "yourpress@gmail.com",
    gstNumber: "", // add if applicable
    upiId: "yourpress@upi",
};

export const JOB_TYPE_DEFAULTS: Record<string, { hsn: string; gst: number }> = {
    "Business Cards": { hsn: "4911", gst: 18 },
    "Banners": { hsn: "4911", gst: 18 },
    "Letterheads": { hsn: "4911", gst: 18 },
    "Wedding Cards": { hsn: "4909", gst: 12 },
    "Pamphlets": { hsn: "4901", gst: 12 },
    "Stickers": { hsn: "4911", gst: 18 },
    "Flex Prints": { hsn: "4911", gst: 18 },
};

export const DEFAULT_GST_RATES = [
    { id: "std-5", label: "5%", rate: 5 },
    { id: "std-12", label: "12%", rate: 12 },
    { id: "std-18", label: "18%", rate: 18 },
    { id: "std-28", label: "28%", rate: 28 },
];
