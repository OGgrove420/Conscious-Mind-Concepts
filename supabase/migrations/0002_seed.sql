-- CMC Growth Store — initial data: categories, faqs, launch discount code.
-- Mirrors data/seed.sql exactly. Testimonials are NOT seeded: only real
-- customer quotes belong on the store.

insert into categories (slug, name, description, icon, sort_order) values
  ('mindset-personal-development', 'Mindset and Personal Development', 'Mindset workbooks, journals, goal-setting and discipline guides.', 'M', 1),
  ('mental-wellness', 'Mental Wellness', 'Emotional intelligence, regulation, stress and resilience resources.', 'W', 2),
  ('business-development', 'Business Development', 'Business planning, financial management and operations toolkits.', 'B', 3),
  ('sales-customer-service', 'Sales and Customer Service', 'Sales mastery, objection handling and service performance resources.', 'S', 4),
  ('leadership-management', 'Leadership and Management', 'Leadership development, team and performance management.', 'L', 5),
  ('digital-skills-ai', 'Digital Skills and AI', 'AI prompt libraries, digital productivity and automation guides.', 'A', 6),
  ('courses-masterclasses', 'Courses and Masterclasses', 'Recorded training, video programmes and development packages.', 'C', 7)
on conflict (slug) do nothing;

insert into faqs (question, answer, sort_order) values
  ('How do I receive my product after paying?', 'Your secure download links are emailed to you the moment Ozow confirms your payment — usually within seconds. You can also open your order page any time with your order reference and email to get fresh links.', 1),
  ('What payment methods can I use?', 'We use Ozow, South Africa''s instant EFT payment system. You pay securely from your own bank account — no card details are stored on our site.', 2),
  ('Can I buy without creating an account?', 'Yes. Guest checkout works fine and your download links arrive by email. An account is optional and simply keeps all your purchases in one library.', 3),
  ('What file format are the products?', 'All products are delivered as PDF downloads unless the product page says otherwise (for example, editable templates are noted on their page).', 4),
  ('How many times can I download my purchase?', 'Each purchase includes several downloads per product, and you can always request a fresh secure link from your order page. If you run out, contact us and we will reset it.', 5),
  ('Is my payment information safe?', 'Yes. Payments are handled entirely by Ozow on their secure platform. We never see or store your banking credentials, and our download links are expiring and single-use.', 6),
  ('What is your refund policy?', 'Because these are instantly delivered digital products, all sales are final once the file has been downloaded. If something went wrong with your order or the file, contact us and we will make it right.', 7),
  ('Do you offer bulk or corporate licences?', 'Yes. For team and corporate licensing of any resource, contact us directly and we will put a package together.', 8);

insert into discount_codes (code, type, value, active) values ('LAUNCH10', 'percent', 10, true)
on conflict (code) do nothing;
