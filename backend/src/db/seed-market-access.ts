import 'dotenv/config';
import mongoose from 'mongoose';
import ProductCategory from '../models/ProductCategory';
import MarketCertification from '../models/MarketCertification';
import MarketRequirement from '../models/MarketRequirement';
import UserProduct from '../models/UserProduct';

import { connectMongo, disconnectMongo } from './mongo';

async function seed() {
  await connectMongo();

  await ProductCategory.deleteMany({});
  await MarketCertification.deleteMany({});
  await MarketRequirement.deleteMany({});
  await UserProduct.deleteMany({});
  console.log('Cleared existing Market Access collections');

  const categories = [
    'Bluetooth Speaker', 'Mobile Phone', 'Power Bank', 'LED Light', 'Smart Watch',
    'Laptop', 'Adapter', 'Battery', 'Wireless Earbuds', 'Tablet',
  ];

  for (let i = categories.length; i < 50; i++) {
    categories.push(`Generic Device Type ${i + 1}`);
  }

  const categoryDocs = [];
  for (const name of categories) {
    const doc = await ProductCategory.create({
      categoryName: name,
      keywords: [name.toLowerCase(), 'electronics'],
      industry: 'Electronics',
      description: `Description for ${name}`
    });
    categoryDocs.push(doc);
  }
  console.log('Created 50 Product Categories');

  const countries = [
    'India', 'Saudi Arabia', 'UAE', 'Europe', 'USA', 'Canada', 'Australia', 'Japan',
    'South Korea', 'Brazil', 'Mexico', 'South Africa', 'UK', 'Singapore', 'Malaysia',
    'Indonesia', 'Vietnam', 'Thailand', 'Philippines', 'New Zealand'
  ];

  const certData = [
    { name: 'BIS', code: 'BIS_CRS', country: 'India', auth: 'Bureau of Indian Standards', time: '30-45 days', cost: '$1000' },
    { name: 'WPC', code: 'WPC_ETA', country: 'India', auth: 'WPC', time: '15-20 days', cost: '$500' },
    { name: 'TEC', code: 'TEC_MTCTE', country: 'India', auth: 'TEC', time: '60 days', cost: '$2000' },
    { name: 'EPR', code: 'EPR_EWASTE', country: 'India', auth: 'CPCB', time: '45 days', cost: '$1200' },
    { name: 'SASO', code: 'SASO_SABER', country: 'Saudi Arabia', auth: 'SASO', time: '15 days', cost: '$800' },
    { name: 'ECAS', code: 'ECAS_MOIAT', country: 'UAE', auth: 'MoIAT', time: '20 days', cost: '$1500' },
    { name: 'CE', code: 'CE_MARK', country: 'Europe', auth: 'EU Notified Body', time: '60 days', cost: '$3000' },
    { name: 'FCC', code: 'FCC_ID', country: 'USA', auth: 'FCC', time: '30 days', cost: '$2500' },
    { name: 'RoHS', code: 'ROHS_COMP', country: 'Europe', auth: 'Various', time: '20 days', cost: '$800' },
  ];

  for (let i = certData.length; i < 50; i++) {
    certData.push({
      name: `CERT-${i+1}`,
      code: `CODE_${i+1}`,
      country: countries[i % countries.length],
      auth: `Auth ${i+1}`,
      time: '30 days',
      cost: '$1000'
    });
  }

  const certDocs = [];
  for (const c of certData) {
    const doc = await MarketCertification.create({
      certificationName: c.name,
      code: c.code,
      country: c.country,
      authority: c.auth,
      estimatedTimeline: c.time,
      estimatedCost: c.cost,
      renewalCycle: '1 Year'
    });
    certDocs.push(doc);
  }
  console.log('Created 50 Certifications');

  let rulesCreated = 0;
  for (let i = 0; i < 200; i++) {
    const cat = categoryDocs[i % categoryDocs.length];
    const country = countries[i % countries.length];
    
    const countryCerts = certDocs.filter(c => c.country === country);
    if (countryCerts.length === 0) continue;

    const numRequired = Math.min(Math.floor(Math.random() * 3) + 1, countryCerts.length);
    const required = countryCerts.slice(0, numRequired).map(c => c._id);

    try {
      await MarketRequirement.create({
        country: country,
        productCategoryId: cat._id,
        requiredCertifications: required,
        optionalCertifications: [],
        marketReadinessRules: `Must comply with local regulations in ${country}`
      });
      rulesCreated++;
    } catch (e) {
      // Ignore unique constraint duplicates
    }
  }

  const btSpeaker = categoryDocs.find(c => c.categoryName === 'Bluetooth Speaker');
  if (btSpeaker) {
    const bis = certDocs.find(c => c.code === 'BIS_CRS')?._id;
    const wpc = certDocs.find(c => c.code === 'WPC_ETA')?._id;
    const saso = certDocs.find(c => c.code === 'SASO_SABER')?._id;
    const ecas = certDocs.find(c => c.code === 'ECAS_MOIAT')?._id;
    const ce = certDocs.find(c => c.code === 'CE_MARK')?._id;
    const fcc = certDocs.find(c => c.code === 'FCC_ID')?._id;

    if (bis && wpc) await MarketRequirement.findOneAndUpdate({ country: 'India', productCategoryId: btSpeaker._id }, { requiredCertifications: [bis, wpc] }, { upsert: true });
    if (saso) await MarketRequirement.findOneAndUpdate({ country: 'Saudi Arabia', productCategoryId: btSpeaker._id }, { requiredCertifications: [saso] }, { upsert: true });
    if (ecas) await MarketRequirement.findOneAndUpdate({ country: 'UAE', productCategoryId: btSpeaker._id }, { requiredCertifications: [ecas] }, { upsert: true });
    if (ce) await MarketRequirement.findOneAndUpdate({ country: 'Europe', productCategoryId: btSpeaker._id }, { requiredCertifications: [ce] }, { upsert: true });
    if (fcc) await MarketRequirement.findOneAndUpdate({ country: 'USA', productCategoryId: btSpeaker._id }, { requiredCertifications: [fcc] }, { upsert: true });
  }

  console.log(`Created ${rulesCreated} Market Requirement Rules`);
  console.log('Seed Complete!');
  await disconnectMongo();
  process.exit(0);
}

seed().catch(console.error);
