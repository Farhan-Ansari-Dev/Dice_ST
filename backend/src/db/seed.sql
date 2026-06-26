-- Seed data for development
-- Run after schema.sql

-- Admin user
INSERT INTO users (email, name, role, company_name, is_verified) VALUES
  ('admin@sanyogconformity.com', 'Admin User', 'admin', 'Sanyog Conformity Solutions', true),
  ('priya@sanyog.com', 'Priya Sharma', 'employee', 'Sanyog Conformity Solutions', true),
  ('rohit@sanyog.com', 'Rohit Verma', 'employee', 'Sanyog Conformity Solutions', true)
ON CONFLICT (email) DO NOTHING;

-- Client users
INSERT INTO users (email, name, role, company_name, is_verified) VALUES
  ('buyer@tataconsumer.com', 'Priya Mehta', 'client', 'Tata Consumer Products', true),
  ('compliance@reliance.com', 'Rohit Sharma', 'client', 'Reliance Retail', true),
  ('legal@itc.com', 'Anjali Kapoor', 'client', 'ITC Limited', true),
  ('certs@hul.com', 'Vikram Nair', 'client', 'Hindustan Unilever', true)
ON CONFLICT (email) DO NOTHING;

-- Sample insights
INSERT INTO insights (title, summary, content, source, category, country, tags, relevance_score, published_at) VALUES
  ('BIS Amends IS 1293:2025 for Electrical Plugs & Sockets',
   'Amendment No. 3 to IS 1293:2025 released, affecting all plug and socket certifications.',
   'The Bureau of Indian Standards has released Amendment No. 3 to IS 1293:2025, affecting all plug and socket certifications issued before March 2025. Manufacturers must comply by September 2025.',
   'BIS Official', 'bis_update', 'India', ARRAY['BIS','IS 1293','Electrical'], 0.95, NOW() - INTERVAL '1 day'),
  ('CBIC Revises Import Duty for Consumer Electronics',
   'New duty structure for HS Code 8501-8543 effective June 1, 2025.',
   'The Central Board of Indirect Taxes & Customs has revised import duty structure for consumer electronics.',
   'CBIC', 'customs', 'India', ARRAY['Customs','Electronics','Import Duty'], 0.88, NOW() - INTERVAL '2 days'),
  ('FSSAI Mandates QR Code on All Packaged Food Products',
   'Mandatory QR codes on packaged food from July 1, 2025.',
   'Food Safety and Standards Authority of India has made QR codes mandatory for all packaged food manufacturers.',
   'FSSAI', 'certification', 'India', ARRAY['FSSAI','QR Code','Food Safety'], 0.92, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

SELECT 'Seed data inserted successfully' as result;
