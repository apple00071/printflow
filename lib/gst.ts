export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
}

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  isInterState: boolean
) {
  if (gstRate === 0) return {
    cgst: 0, sgst: 0, igst: 0,
    totalWithGST: taxableAmount
  }
  
  if (isInterState) {
    const igst = round2(taxableAmount * gstRate / 100)
    return { cgst: 0, sgst: 0, igst, 
             totalWithGST: round2(taxableAmount + igst) }
  }
  
  const half = round2(taxableAmount * (gstRate / 2) / 100)
  return { cgst: half, sgst: half, igst: 0,
           totalWithGST: round2(taxableAmount + half + half) }
}

export function validateGSTIN(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return regex.test(gstin)
}

export function getStateFromGSTIN(gstin: string): string {
  const code = gstin.substring(0, 2)
  return GST_STATE_CODES[code] || 'Unknown'
}
