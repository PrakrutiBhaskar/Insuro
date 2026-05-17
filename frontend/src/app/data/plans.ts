export const allPlans = [
  { 
    id: 'diabshield',
    name: 'DiabShield Comprehensive Plus', 
    ins: 'Star Health', 
    price: 2840, 
    tags: ['Diabetes', 'Endocrinology', 'Cashless'], 
    sumInsured: '₹15 Lakhs', 
    deductible: '₹5,000', 
    opdCover: '✓ Included', 
    diabetesOpd: '✓ Yes', 
    preventive: '✓ Annual', 
    cashlessNetwork: '✓ 9,000+', 
    mentalHealth: '– Not covered', 
    suitability: '94%', 
    covType: 'Comprehensive',
    benefits: [
      'Day 1 cover for diabetes-related complications',
      'Free quarterly HbA1c and lipid profile testing',
      'Unlimited tele-consultations with endocrinologists',
      'Access to wellness coach for diet and lifestyle management'
    ],
    exclusions: [
      'Mental health and psychiatric treatments',
      'Cosmetic and weight-loss surgeries',
      'Pre-existing conditions other than diabetes (2-year waiting period)'
    ],
    pros: 'Excellent network, comprehensive coverage, and tailored preventive checkups.',
    cons: 'Slightly higher premium, waiting period applies to other pre-existing conditions.'
  },
  { 
    id: 'chronic-protect',
    name: 'CareEdge Chronic Protect 360°', 
    ins: 'HDFC ERGO', 
    price: 2460, 
    tags: ['Preventive', 'HbA1c', 'Screenings'], 
    sumInsured: '₹10 Lakhs', 
    deductible: '₹7,500', 
    opdCover: '✓ Included', 
    diabetesOpd: '✓ Yes', 
    preventive: '✓ Quarterly', 
    cashlessNetwork: '5,200+', 
    mentalHealth: '– Not covered', 
    suitability: '87%', 
    covType: 'Preventive',
    benefits: [
      'Quarterly comprehensive preventive health checkups',
      'Discounted pharmacy bills for chronic medications',
      'No claim bonus up to 100% of sum insured'
    ],
    exclusions: [
      'Maternity and newborn cover',
      'Dental and vision care'
    ],
    pros: 'Great for active management of chronic conditions with frequent checkups.',
    cons: 'Higher deductible, smaller cashless network compared to competitors.'
  },
  { 
    id: 'optima-restore',
    name: 'OptimaRestore Active Wellness', 
    ins: 'Max Bupa', 
    price: 2980, 
    tags: ['Cardiac', 'Sum ₹20L', 'Wellness'], 
    sumInsured: '₹20 Lakhs', 
    deductible: '₹0', 
    opdCover: '– Limited', 
    diabetesOpd: '– Add-on', 
    preventive: '✓ Annual', 
    cashlessNetwork: '✓ 7,500+', 
    mentalHealth: '✓ Included', 
    suitability: '81%', 
    covType: 'Comprehensive',
    benefits: [
      'Automatic 100% restoration of sum insured upon exhaustion',
      'Mental health coverage including therapy sessions',
      'Zero deduction on consumable items during hospitalization'
    ],
    exclusions: [
      'Diabetes OPD (requires separate paid add-on)',
      'Alternative treatments (AYUSH) outside network'
    ],
    pros: 'High sum insured with mental health coverage and zero deductibles.',
    cons: 'Diabetes OPD is not included by default and requires an add-on.'
  },
  { 
    id: 'ihealth-shield',
    name: 'iHealth Shield Critical Care', 
    ins: 'ICICI Lombard', 
    price: 1980, 
    tags: ['Critical Illness', 'Low Deductible'], 
    sumInsured: '₹25 Lakhs', 
    deductible: '₹2,500', 
    opdCover: '– Not covered', 
    diabetesOpd: '– Not covered', 
    preventive: '– Not covered', 
    cashlessNetwork: '4,800+', 
    mentalHealth: '– Not covered', 
    suitability: '74%', 
    covType: 'Critical Illness',
    benefits: [
      'Lump-sum payout upon diagnosis of listed critical illnesses',
      'High coverage amount for major surgeries',
      'Global cover for planned treatments'
    ],
    exclusions: [
      'Any form of Out-Patient Department (OPD) expenses',
      'Routine diagnostic tests and consultations'
    ],
    pros: 'Very high sum insured for critical illnesses at an affordable premium.',
    cons: 'Does not cover day-to-day medical expenses or preventive care.'
  },
  { 
    id: 'reassure-360',
    name: 'Niva Bupa ReAssure 360', 
    ins: 'Niva Bupa', 
    price: 2200, 
    tags: ['Mental Health', 'Maternity', 'Cashless'], 
    sumInsured: '₹10 Lakhs', 
    deductible: '₹0', 
    opdCover: '✓ Included', 
    diabetesOpd: '– Not covered', 
    preventive: '✓ Annual', 
    cashlessNetwork: '✓ 8,000+', 
    mentalHealth: '✓ Included', 
    suitability: '70%', 
    covType: 'Comprehensive',
    benefits: [
      'Unlimited tele-consultations for general physicians',
      'Maternity benefits up to ₹50,000 after 2 years',
      'ReAssure benefit: sum insured triggers unlimited times'
    ],
    exclusions: [
      'Specific pre-existing conditions (3-year waiting period)',
      'Diabetes specific OPD care'
    ],
    pros: 'Excellent general coverage with maternity and mental health inclusion.',
    cons: 'Long waiting period for pre-existing diseases.'
  },
  { 
    id: 'digit-health',
    name: 'Digit Health Plus', 
    ins: 'Go Digit', 
    price: 1650, 
    tags: ['Affordable', 'Digital First', 'OPD'], 
    sumInsured: '₹5 Lakhs', 
    deductible: '₹1,000', 
    opdCover: '✓ Included', 
    diabetesOpd: '– Not covered', 
    preventive: '– Not covered', 
    cashlessNetwork: '10,000+', 
    mentalHealth: '– Not covered', 
    suitability: '65%', 
    covType: 'Basic',
    benefits: [
      'Paperless, digital-first claims process via app',
      'Wide cashless hospital network',
      'Basic OPD coverage for seasonal illnesses'
    ],
    exclusions: [
      'Major critical illnesses',
      'Preventive health checkups'
    ],
    pros: 'Highly affordable and easy digital claims experience.',
    cons: 'Low sum insured and limited coverage for complex or chronic conditions.'
  },
];
