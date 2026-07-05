require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

// Pass the LibSQL configuration object directly to the factory
const adapter = new PrismaLibSql({
  url: 'file:prisma/dev.db'
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.user.deleteMany({});
  await prisma.shopperSession.deleteMany({});
  await prisma.aBTestStats.deleteMany({});

  // 1. Create default admin user
  await prisma.user.create({
    data: {
      username: 'admin',
      password: 'password123', // In a production app, use hashed passwords!
      role: 'admin'
    }
  });

  // 2. Seed historical shopper sessions for RAG (Retrieval-Augmented Generation)
  const historicalSessions = [
    {
      user: 'U001',
      events: JSON.stringify(['Visited Homepage', 'Viewed Running Shoes', 'Added Running Shoes to Cart', 'Left Website']),
      rulePrediction: 'Cart Abandoner',
      ruleExplanations: 'Cart Abandoner: User added item(s) to the cart or started checkout but left the site without completing a purchase.',
      aiClassification: 'Cart Abandoner',
      confidence: 90,
      evidence: JSON.stringify(['Added Running Shoes to Cart', 'Left website without purchasing']),
      recommendedAction: 'Trigger a cart abandonment email with a free shipping code.',
      reasoning: 'Shopper exited after adding items to the cart, showing standard cart abandonment.',
      abVariant: 'A',
      isConversion: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    },
    {
      user: 'U001',
      events: JSON.stringify(['Visited Homepage', 'Viewed Running Shoes', 'Checkout Started', 'Purchase Completed']),
      rulePrediction: 'Impulse Buyer',
      ruleExplanations: 'Impulse Buyer: User went from homepage or product view to purchase very quickly in a short span of events.',
      aiClassification: 'Impulse Buyer',
      confidence: 95,
      evidence: JSON.stringify(['Purchased running shoes in 4 actions', 'Quick checkout session']),
      recommendedAction: 'Display 1-click buy upsell for Running Socks.',
      reasoning: 'User bought items quickly, showing high purchasing speed.',
      abVariant: 'B',
      isConversion: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      user: 'SIM-404',
      events: JSON.stringify(['Visited Homepage', 'Viewed Wireless Earbuds', 'Added Wireless Earbuds to Cart', 'Left Website']),
      rulePrediction: 'Cart Abandoner',
      ruleExplanations: 'Cart Abandoner: User added item(s) to the cart or started checkout but left the site without completing a purchase.',
      aiClassification: 'Cart Abandoner',
      confidence: 88,
      evidence: JSON.stringify(['Added Wireless Earbuds to Cart', 'Left site']),
      recommendedAction: 'Trigger a cart abandonment email with a free shipping code.',
      reasoning: 'Shopper exited after adding items to the cart, showing standard cart abandonment.',
      abVariant: 'A',
      isConversion: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      user: 'U002',
      events: JSON.stringify(['Visited Homepage', 'Viewed Leather Jacket', 'Coupon Applied', 'Left Website']),
      rulePrediction: 'Discount Seeker',
      ruleExplanations: 'Discount Seeker: User explicitly applied a coupon code or searched for discounts during their session.',
      aiClassification: 'Discount Seeker',
      confidence: 94,
      evidence: JSON.stringify(['Applied coupon code', 'Browsed clearance items']),
      recommendedAction: 'Show coupon expiration countdown timer.',
      reasoning: 'User applied discount codes and exited without buying.',
      abVariant: 'A',
      isConversion: false,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const session of historicalSessions) {
    await prisma.shopperSession.create({ data: session });
  }

  // 3. Seed A/B Test stats for dashboard charts
  const stats = [
    { classification: 'Cart Abandoner', variant: 'A', recommendation: 'Send a cart recovery email after 30 minutes featuring a free shipping code.', impressions: 45, conversions: 12 },
    { classification: 'Cart Abandoner', variant: 'B', recommendation: 'Display a exit-intent popup with 10% coupon.', impressions: 42, conversions: 18 },
    { classification: 'Discount Seeker', variant: 'A', recommendation: 'Show coupon expiration countdown timer.', impressions: 30, conversions: 15 },
    { classification: 'Discount Seeker', variant: 'B', recommendation: 'Show standard discount banner.', impressions: 28, conversions: 8 },
    { classification: 'Loyal Customer', variant: 'A', recommendation: 'Offer early VIP access to next collection.', impressions: 25, conversions: 20 },
    { classification: 'Loyal Customer', variant: 'B', recommendation: 'Offer free standard shipping.', impressions: 24, conversions: 12 },
    { classification: 'Comparer', variant: 'A', recommendation: 'Display spec comparison chart.', impressions: 35, conversions: 14 },
    { classification: 'Comparer', variant: 'B', recommendation: 'Display customer reviews.', impressions: 38, conversions: 11 }
  ];

  for (const stat of stats) {
    await prisma.aBTestStats.create({ data: stat });
  }

  console.log('Database successfully seeded!');
}

main()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
