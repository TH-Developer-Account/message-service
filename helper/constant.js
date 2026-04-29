// states-districts.js — put this in your helpers folder
export const INDIA_STATES = [
  { id: "AP", title: "Andhra Pradesh" },
  { id: "AR", title: "Arunachal Pradesh" },
  { id: "AS", title: "Assam" },
  { id: "BR", title: "Bihar" },
  { id: "CG", title: "Chhattisgarh" },
  { id: "GA", title: "Goa" },
  { id: "GJ", title: "Gujarat" },
  { id: "HR", title: "Haryana" },
  { id: "HP", title: "Himachal Pradesh" },
  { id: "JH", title: "Jharkhand" },
  { id: "KA", title: "Karnataka" },
  { id: "KL", title: "Kerala" },
  { id: "MP", title: "Madhya Pradesh" },
  { id: "MH", title: "Maharashtra" },
  { id: "MN", title: "Manipur" },
  { id: "ML", title: "Meghalaya" },
  { id: "MZ", title: "Mizoram" },
  { id: "NL", title: "Nagaland" },
  { id: "OD", title: "Odisha" },
  { id: "PB", title: "Punjab" },
  { id: "RJ", title: "Rajasthan" },
  { id: "SK", title: "Sikkim" },
  { id: "TN", title: "Tamil Nadu" },
  { id: "TG", title: "Telangana" },
  { id: "TR", title: "Tripura" },
  { id: "UP", title: "Uttar Pradesh" },
  { id: "UK", title: "Uttarakhand" },
  { id: "WB", title: "West Bengal" },
  { id: "DL", title: "Delhi" },
  { id: "JK", title: "Jammu & Kashmir" },
  { id: "LA", title: "Ladakh" },
  { id: "PY", title: "Puducherry" },
  { id: "CH", title: "Chandigarh" },
  { id: "AN", title: "Andaman & Nicobar Islands" },
  { id: "DN", title: "Dadra & Nagar Haveli and Daman & Diu" },
  { id: "LD", title: "Lakshadweep" },
];

export const DISTRICTS_BY_STATE = {
  MH: [
    { id: "MH-MUM", title: "Mumbai" },
    { id: "MH-PUN", title: "Pune" },
    { id: "MH-NGP", title: "Nagpur" },
    { id: "MH-NAS", title: "Nashik" },
    { id: "MH-AUR", title: "Aurangabad" },
    { id: "MH-KOL", title: "Kolhapur" },
    { id: "MH-SOL", title: "Solapur" },
    { id: "MH-AMR", title: "Amravati" },
  ],
  KA: [
    { id: "KA-BLR", title: "Bengaluru Urban" },
    { id: "KA-MYS", title: "Mysuru" },
    { id: "KA-HUB", title: "Hubballi-Dharwad" },
    { id: "KA-MAN", title: "Mangaluru" },
    { id: "KA-BLG", title: "Belagavi" },
    { id: "KA-KAL", title: "Kalaburagi" },
    { id: "KA-DAV", title: "Davanagere" },
    { id: "KA-SHI", title: "Shivamogga" },
  ],
  TN: [
    { id: "TN-CHE", title: "Chennai" },
    { id: "TN-COI", title: "Coimbatore" },
    { id: "TN-MAD", title: "Madurai" },
    { id: "TN-TRI", title: "Tiruchirappalli" },
    { id: "TN-SAL", title: "Salem" },
    { id: "TN-TIR", title: "Tirunelveli" },
    { id: "TN-VEL", title: "Vellore" },
    { id: "TN-ERO", title: "Erode" },
  ],
  GJ: [
    { id: "GJ-AHM", title: "Ahmedabad" },
    { id: "GJ-SUR", title: "Surat" },
    { id: "GJ-VAD", title: "Vadodara" },
    { id: "GJ-RAJ", title: "Rajkot" },
    { id: "GJ-BHA", title: "Bhavnagar" },
    { id: "GJ-JUN", title: "Junagadh" },
    { id: "GJ-GAN", title: "Gandhinagar" },
    { id: "GJ-ANA", title: "Anand" },
  ],
  UP: [
    { id: "UP-LKO", title: "Lucknow" },
    { id: "UP-KAN", title: "Kanpur" },
    { id: "UP-AGR", title: "Agra" },
    { id: "UP-VAR", title: "Varanasi" },
    { id: "UP-PRA", title: "Prayagraj" },
    { id: "UP-MER", title: "Meerut" },
    { id: "UP-GZB", title: "Ghaziabad" },
    { id: "UP-NOI", title: "Gautam Buddha Nagar (Noida)" },
  ],
  RJ: [
    { id: "RJ-JAI", title: "Jaipur" },
    { id: "RJ-JOD", title: "Jodhpur" },
    { id: "RJ-UDA", title: "Udaipur" },
    { id: "RJ-KOT", title: "Kota" },
    { id: "RJ-BIK", title: "Bikaner" },
    { id: "RJ-AJM", title: "Ajmer" },
    { id: "RJ-SIK", title: "Sikar" },
    { id: "RJ-ALW", title: "Alwar" },
  ],
  DL: [
    { id: "DL-CEN", title: "Central Delhi" },
    { id: "DL-EAS", title: "East Delhi" },
    { id: "DL-NEW", title: "New Delhi" },
    { id: "DL-NOR", title: "North Delhi" },
    { id: "DL-NWD", title: "North West Delhi" },
    { id: "DL-SOU", title: "South Delhi" },
    { id: "DL-SOW", title: "South West Delhi" },
    { id: "DL-WES", title: "West Delhi" },
  ],
  // Add remaining states as needed...
};

export const ISSUE_TYPES = [
  { id: "breakdown", title: "Breakdown" },
  { id: "maintenance", title: "Scheduled Maintenance" },
  { id: "inspection", title: "Routine Inspection" },
  { id: "installation", title: "New Installation" },
  { id: "calibration", title: "Calibration" },
  { id: "other", title: "Other" },
];

export const LANGUAGES = [
  { id: "en", title: "English" },
  { id: "hi", title: "Hindi" },
  { id: "mr", title: "Marathi" },
  { id: "ta", title: "Tamil" },
  { id: "te", title: "Telugu" },
  { id: "kn", title: "Kannada" },
  { id: "ml", title: "Malayalam" },
  { id: "gu", title: "Gujarati" },
  { id: "bn", title: "Bengali" },
  { id: "pa", title: "Punjabi" },
  { id: "or", title: "Odia" },
  { id: "ur", title: "Urdu" },
];

export const getDistrictsByState = (stateId) => {
  return DISTRICTS_BY_STATE[stateId] || [{ id: "OTHER", title: "Other" }];
};

export const TEMPLATES = {
  PO_STATUS: {
    name: "po_status_utility_template",
    flowToken: "po_status_utility_template_flow_token",
  },
  SERVICE_TICKET: {
    name: "service_ticket_utility_template",
    flowToken: "service_ticket_utility_template_flow_token",
  },
  CREATE_TICKET: {
    name: "create_service_ticket",
    flowToken: "create_service_ticket_flow_token",
  },
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export const formatServiceMessage = (data) => {
  return `🔧 *Service Update*

*Mobility Id:* ${data.mobilityId}
*Status:* ${data.status}
*Trip Status:* ${data.tripStatus}

*Service Order ID:* ${data.mobilityId}
*Customer Call No:* ${data.customerCallNo}
*Follow-up Call No:* ${data.followupCallNo}

*Machine Details:*
• Model: ${data.machineModel}
• Serial No: ${data.machineSerialNo}

*Engineer:* ${data.serviceEngineerName}

*Timeline:*
• Assigned: ${formatDate(data.engineerAssignedDate)}
• Resolved: ${formatDate(data.resolutionDate)}

✅ Your service request has been successfully completed.`;
};
