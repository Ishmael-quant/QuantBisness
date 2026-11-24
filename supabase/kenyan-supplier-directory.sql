alter table public.supplier_contacts
  drop constraint if exists supplier_contacts_industry_check;
alter table public.supplier_contacts
  add constraint supplier_contacts_industry_check
  check (industry in (
    'tech', 'agric', 'digital', 'education', 'stores', 'other',
    'construction', 'printing_manufacturing', 'energy_electronics',
    'healthcare', 'transport_logistics', 'telecommunications',
    'renewable_energy', 'energy_electrical', 'office_supplies',
    'manufacturing_packaging', 'electrical_manufacturing', 'agribusiness',
    'packaging', 'chemicals'
  ));

do $$
declare
  supplier_row record;
begin
  for supplier_row in
    select *
    from (values
      ('Buytec Stores Ltd', 'Buytec Stores Ltd', 'nairobi', 'Kenya', 'tech',
       'Computers, laptops, servers, networking, printers and office technology. Address: Moi Avenue Bazaar Plaza, 7th Floor, Crystal Suites, Suite 718, Nairobi, Kenya.',
       '+254 711 085540'),
      ('Elgon Kenya Ltd', 'Elgon Kenya Ltd', 'nairobi', 'Kenya', 'agric',
       'Seeds, fertilizers, agrochemicals, irrigation and farm equipment. Address: Behind Lab & Allied, National Park East Gate Road, off Mombasa Road, Kenya.',
       '+254 110 094464'),
      ('UDONGA TIMBER & GENERAL CONSTRUCTION HARDWARE', 'UDONGA TIMBER & GENERAL CONSTRUCTION HARDWARE', 'nyanza', 'Kenya', 'construction',
       'Timber, lumber and construction hardware. Address: Near Mudasa Academy, Kondele, Kisumu, Kenya.',
       '+254 142 625507'),
      ('National Printing Press Ltd. - Manufacturing', 'National Printing Press Ltd. - Manufacturing', 'nyanza', 'Kenya', 'printing_manufacturing',
       'Commercial printing, stationery, packaging and promotional materials. Address: WQ85+83R, next to Sunshine Auto Mobiles Garage, Sabuni Road, Kisumu, Kenya.',
       '+254 57 2024625'),
      ('KITALI SUPPLIERS LTD', 'KITALI SUPPLIERS LTD', 'nairobi', 'Kenya', 'energy_electronics',
       'Solar equipment, batteries, lighting, generators and electronics. Address: RNG Plaza, 4th Floor, Room OS1, Ronald Ngala Street, Nairobi, Kenya.',
       '+254 781 111118'),
      ('Summer health medical supplies', 'Summer health medical supplies', 'nairobi', 'Kenya', 'healthcare',
       'Medical equipment, hospital supplies and medical consumables. Address: Pramukh Plaza, Munyu Road, Nairobi, Kenya.',
       '+254 705 022930'),
      ('MAFL Logistics Ltd.', 'MAFL Logistics Ltd.', 'eastern', 'Kenya', 'transport_logistics',
       'Freight forwarding, cargo transport, warehousing and logistics. Address: Malili, 090100, Konza, Kenya.',
       '+254 711 111017'),
      ('Call Experts Limited', 'Call Experts Limited', 'nairobi', 'Kenya', 'telecommunications',
       'Business telephone systems and communication solutions. Address: 2129 Office Suites, Suite 405, 4th Floor, 69 Muthithi Road, Nairobi, Kenya.',
       '+254 709 080123'),
      ('FarmChoice Inputs And Technical Services Ltd', 'FarmChoice Inputs And Technical Services Ltd', 'nyanza', 'Kenya', 'agric',
       'Agricultural inputs and farm equipment. Address: Market, Odera Street, Kisumu, Kenya.',
       '+254 721 427714'),
      ('KADETA BUILDING MATERIALS SUPPLIERS', 'KADETA BUILDING MATERIALS SUPPLIERS', 'nyanza', 'Kenya', 'construction',
       'Sand, ballast, timber, stones and other building materials. Address: Along Kondele-Kibos Road, Kisumu, Kenya.',
       '+254 745 349742'),
      ('First Sun Technologies Ltd', 'First Sun Technologies Ltd', 'central', 'Kenya', 'renewable_energy',
       'Solar panels, electrical equipment and solar installation. Address: Imani Place, Ruiru, Kenya.',
       '+254 705 222555'),
      ('PowerPoint Systems (E.A) Ltd', 'PowerPoint Systems (E.A) Ltd', 'nairobi', 'Kenya', 'energy_electrical',
       'Solar panels, inverters, batteries and electrical equipment. Address: DRS House, Lusaka Road, Nairobi, Kenya.',
       '+254 722 155534'),
      ('Text Book Centre Limited', 'Text Book Centre Limited', 'nairobi', 'Kenya', 'office_supplies',
       'Books, stationery and office supplies. Address: Kijabe Street, Nairobi, Kenya.',
       '0730 735000'),
      ('Packaging Industries Limited', 'Packaging Industries Limited', 'nairobi', 'Kenya', 'manufacturing_packaging',
       'Packaging materials. Address: Lunga Lunga Road, Nairobi, Kenya.',
       '0722 825330'),
      ('Metsec Cables Ltd', 'Metsec Cables Ltd', 'nairobi', 'Kenya', 'electrical_manufacturing',
       'Electrical cables. Address: Doshi Complex, Mombasa Road, Nairobi, Kenya.',
       '0703 030000'),
      ('Amiran Kenya Ltd', 'Amiran Kenya Ltd', 'nairobi', 'Kenya', 'agribusiness',
       'Agricultural inputs and farm solutions. Address: Old Airport North Road, Embakasi, Nairobi, Kenya.',
       '0719 095000'),
      ('Tetra Pak Ltd', 'Tetra Pak Ltd', 'nairobi', 'Kenya', 'packaging',
       'Food and beverage packaging solutions. Address: Enterprise/Likoni Road, Nairobi, Kenya.',
       '0711 021258'),
      ('Highchem East Africa Ltd', 'Highchem East Africa Ltd', 'nairobi', 'Kenya', 'chemicals',
       'Chemical and allied products. Address: Mogadishu Road, Industrial Area, Nairobi, Kenya.',
       '0722 205174'),
      ('Sai Office Supplies', 'Sai Office Supplies', 'nairobi', 'Kenya', 'office_supplies',
       'Office supplies and equipment. Address: Ramco Group Industrial Park, Mombasa Road, Nairobi, Kenya.',
       '0726 610510')
    ) as suppliers(name, company, region, country, industry, description, phone)
  loop
    if not exists (
      select 1
      from public.supplier_contacts as existing
      where lower(existing.company) = lower(supplier_row.company)
    ) then
      insert into public.supplier_contacts (
        name, company, region, country, industry, description, phone
      )
      values (
        supplier_row.name,
        supplier_row.company,
        supplier_row.region,
        supplier_row.country,
        supplier_row.industry,
        supplier_row.description,
        supplier_row.phone
      );
    end if;
  end loop;
end;
$$;
