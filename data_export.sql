--
-- PostgreSQL database dump
--

\restrict WS64DiZqJo1yiCbAs9zhlE1vhx6hUW1eW4YaNFNjdFoVH3dlNSdw0ZsifuFgKtI

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.deals VALUES (1, 'https://www.rightmove.co.uk/properties/173614676#/?channel=RES_BUY', 'Lilac Crescent, Beeston, NG9', 350000.00, 'Semi-detached', NULL, 'criteria_check', '{}', '2026-03-24 13:05:05.01565', '2026-03-24 13:05:25.13');


--
-- Data for Name: deposits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.deposits VALUES (1, 1, 1, 2400.00, '2023-02-01', 'DPS', 'DEP-577908', '2023-02-01', 'held', NULL, NULL, NULL, NULL, true, '2023-02-01', NULL, '2026-03-17 00:04:34.626308', '2026-03-17 00:04:34.626308');
INSERT INTO public.deposits VALUES (2, 2, 2, 1700.00, '2023-06-01', 'myDeposits', 'DEP-193745', '2023-06-01', 'held', NULL, NULL, NULL, NULL, true, '2023-06-01', NULL, '2026-03-17 00:04:34.631844', '2026-03-17 00:04:34.631844');
INSERT INTO public.deposits VALUES (3, 1, 3, 3200.00, '2022-09-01', 'TDS', 'DEP-317668', '2022-09-01', 'held', NULL, NULL, NULL, NULL, true, '2022-09-01', NULL, '2026-03-17 00:04:34.636952', '2026-03-17 00:04:34.636952');
INSERT INTO public.deposits VALUES (4, 1, 4, 1900.00, '2023-05-01', 'DPS', 'DEP-808304', '2023-05-01', 'held', NULL, NULL, NULL, NULL, true, '2023-05-01', NULL, '2026-03-17 00:04:34.646138', '2026-03-17 00:04:34.646138');


--
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.maintenance_requests VALUES (1, 6, 'Bathroom Refit', 'Full bathroom replacement including suite, tiling, and plumbing', 'plumbing', 'high', 'in_progress', 4500.00, NULL, '2024-01-15', NULL, 'Contractor booked', '2026-03-16 18:26:03.564895', '2026-03-16 18:26:03.564895');
INSERT INTO public.maintenance_requests VALUES (2, 2, 'Boiler Service', 'Annual boiler service and safety check', 'general', 'medium', 'completed', 120.00, 110.00, '2024-02-01', '2024-02-10', NULL, '2026-03-16 18:26:03.564895', '2026-03-16 18:26:03.564895');
INSERT INTO public.maintenance_requests VALUES (3, 1, 'Roof Tile Repair', 'Three tiles displaced after storm damage', 'structural', 'urgent', 'open', 350.00, NULL, '2024-03-10', NULL, 'Awaiting builder quote', '2026-03-16 18:26:03.564895', '2026-03-16 18:26:03.564895');
INSERT INTO public.maintenance_requests VALUES (4, 4, 'Garden Fence Repair', 'Two fence panels need replacing', 'general', 'low', 'open', 200.00, NULL, '2024-03-15', NULL, NULL, '2026-03-16 18:26:03.564895', '2026-03-16 18:26:03.564895');
INSERT INTO public.maintenance_requests VALUES (5, 5, 'Electrical Socket', 'Faulty socket in kitchen needs replacing', 'electrical', 'medium', 'open', 85.00, NULL, '2024-03-18', NULL, NULL, '2026-03-16 18:26:03.564895', '2026-03-16 18:26:03.564895');


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.properties VALUES (1, '1 Goldfinch Way, Borehamwood WD6 2EN', 'End of Terrace', 3, 550000.00, 600000.00, 2000.00, 0.00, 200.00, 'occupied', '2023-02-27', 'Fully refurbished 2021', '2026-03-16 18:25:45.494717', '2026-03-22 15:04:48.997', 1, 1991, 'D', 'D', NULL, NULL, NULL, NULL, NULL, NULL, '/api/uploads/property-1773703439406.jpeg', 'https://www.rightmove.co.uk/house-prices/details/73a810a6-3d02-4a8c-be89-c2c1dd20be2c', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.properties VALUES (7, '128 Whitehouse Avenue, Borehamwood WD6 1HE', 'Terraced', 3, 540000.00, 600000.00, 2000.00, 0.00, 200.00, 'occupied', '2023-05-24', NULL, '2026-03-17 17:14:39.748282', '2026-03-22 15:08:15.055', 1, 1967, 'D', 'D', NULL, NULL, NULL, NULL, NULL, NULL, '/api/uploads/property-1773767811571.png', 'https://www.rightmove.co.uk/house-prices/details/d95fb645-b957-4555-827c-9c00ac1f9bb2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.properties VALUES (8, '7 Shirwell Close, Mill Hill, London NW7 1HW', 'Terraced', 3, 330000.00, 840000.00, 2100.00, 0.00, 250.00, 'occupied', '2009-08-28', NULL, '2026-03-17 17:19:26.577988', '2026-03-22 15:11:06.21', 1, 2003, 'C', 'F', NULL, NULL, NULL, NULL, NULL, NULL, '/api/uploads/property-1773768034656.png', 'https://www.rightmove.co.uk/house-prices/details/2fba9f00-5b85-4003-8060-7f5dc2243e48', NULL, NULL, 'Squires Estates', NULL, NULL, NULL, NULL, NULL, NULL, 5.00);


--
-- Data for Name: property_valuations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.property_valuations VALUES (1, 1, '2023-02-27', 550000.00, 'Estate Agent Estimate', 'The sale valuation at the time of purchase ', '2026-03-16 20:50:40.795972');
INSERT INTO public.property_valuations VALUES (2, 7, '2023-05-24', 540000.00, 'Estate Agent Estimate', 'Valuation at time of purchase', '2026-03-22 15:08:07.352224');
INSERT INTO public.property_valuations VALUES (3, 8, '2009-08-28', 330000.00, 'Estate Agent Estimate', 'valuation at time of purchase', '2026-03-22 15:10:05.009261');


--
-- Data for Name: refurb_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.refurb_projects VALUES (1, 3, 'Full Interior Redecoration', 'Paint all rooms, new carpets throughout, update kitchen', 'planned', 8000.00, NULL, '2024-05-01', '2024-06-30', 'Smith Interiors Ltd', 'Getting 3 quotes', '2026-03-16 18:26:03.568609', '2026-03-16 18:26:03.568609');
INSERT INTO public.refurb_projects VALUES (2, 1, 'Kitchen Extension Planning', 'Planning permission and architectural drawings for rear extension', 'in_progress', 15000.00, 3200.00, '2024-01-01', '2024-12-31', 'ABC Architects', 'Planning permission submitted', '2026-03-16 18:26:03.568609', '2026-03-16 18:26:03.568609');
INSERT INTO public.refurb_projects VALUES (3, 6, 'Bathroom Refurbishment', 'New bathroom suite, tiles, and fixtures', 'in_progress', 5000.00, 2100.00, '2024-01-15', '2024-02-28', 'Plumb Perfect Ltd', 'Tiles ordered', '2026-03-16 18:26:03.568609', '2026-03-16 18:26:03.568609');
INSERT INTO public.refurb_projects VALUES (4, 4, 'Loft Conversion Feasibility', 'Survey and feasibility study for loft conversion', 'completed', 2500.00, 2200.00, '2023-09-01', '2023-11-30', 'LoftCo Builders', 'Feasibility positive - proceeding in 2025', '2026-03-16 18:26:03.568609', '2026-03-16 18:26:03.568609');


--
-- Data for Name: rent_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.rent_charges VALUES (1, 1, 1, '2026-01-15', 'late_fee', 'Late payment fee – January 2026', 50.00, true, '2026-01-28', false, 'Paid via bank transfer', '2026-03-17 00:04:34.599068');
INSERT INTO public.rent_charges VALUES (2, 2, 2, '2026-02-10', 'damage', 'Broken window pane – living room', 320.00, false, NULL, false, 'Awaiting contractor quote', '2026-03-17 00:04:34.604426');
INSERT INTO public.rent_charges VALUES (3, 1, 1, '2025-12-20', 'cleaning', 'End-of-tenancy deep clean', 180.00, true, '2025-12-28', true, 'Deducted from deposit on checkout', '2026-03-17 00:04:34.609578');
INSERT INTO public.rent_charges VALUES (4, 2, 2, '2026-03-01', 'admin', 'Lease renewal administration fee', 60.00, false, NULL, false, NULL, '2026-03-17 00:04:34.613801');
INSERT INTO public.rent_charges VALUES (5, 1, 1, '2026-02-01', 'legal', 'Solicitor letter – rent arrears notice', 120.00, false, NULL, false, 'Section 8 notice preparation', '2026-03-17 00:04:34.618404');


--
-- Data for Name: rent_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.rent_payments VALUES (1, 1, 1, '2025-10-01', '2025-10-01', 2000.00, 2000.00, 'paid', 'standing_order', 'SO-3539', NULL, '2026-03-17 00:04:34.225123', '2026-03-17 00:04:34.225123');
INSERT INTO public.rent_payments VALUES (2, 1, 1, '2025-11-01', '2025-11-01', 2000.00, 2000.00, 'paid', 'standing_order', 'SO-9082', NULL, '2026-03-17 00:04:34.541476', '2026-03-17 00:04:34.541476');
INSERT INTO public.rent_payments VALUES (3, 1, 1, '2025-12-01', '2025-12-01', 2000.00, 2000.00, 'paid', 'standing_order', 'SO-7605', NULL, '2026-03-17 00:04:34.54876', '2026-03-17 00:04:34.54876');
INSERT INTO public.rent_payments VALUES (4, 1, 1, '2026-01-01', '2026-01-01', 2000.00, 1800.00, 'partial', 'standing_order', 'SO-8467', '£200 balance outstanding', '2026-03-17 00:04:34.554536', '2026-03-17 00:04:34.554536');
INSERT INTO public.rent_payments VALUES (5, 1, 1, '2026-02-01', '2026-02-01', 2000.00, 2000.00, 'paid', 'standing_order', 'SO-4946', NULL, '2026-03-17 00:04:34.560008', '2026-03-17 00:04:34.560008');
INSERT INTO public.rent_payments VALUES (6, 1, 1, '2026-03-01', NULL, 2000.00, NULL, 'pending', NULL, NULL, NULL, '2026-03-17 00:04:34.565059', '2026-03-17 00:04:34.565059');
INSERT INTO public.rent_payments VALUES (7, 2, 2, '2025-10-01', '2025-10-01', 850.00, 850.00, 'paid', 'standing_order', 'SO-1719', NULL, '2026-03-17 00:04:34.569803', '2026-03-17 00:04:34.569803');
INSERT INTO public.rent_payments VALUES (8, 2, 2, '2025-11-01', '2025-11-01', 850.00, 850.00, 'paid', 'standing_order', 'SO-4174', NULL, '2026-03-17 00:04:34.575238', '2026-03-17 00:04:34.575238');
INSERT INTO public.rent_payments VALUES (9, 2, 2, '2025-12-01', '2025-12-01', 850.00, 850.00, 'paid', 'standing_order', 'SO-3292', NULL, '2026-03-17 00:04:34.580981', '2026-03-17 00:04:34.580981');
INSERT INTO public.rent_payments VALUES (10, 2, 2, '2026-01-01', '2026-01-01', 850.00, 850.00, 'paid', 'standing_order', 'SO-9722', NULL, '2026-03-17 00:04:34.585388', '2026-03-17 00:04:34.585388');
INSERT INTO public.rent_payments VALUES (11, 2, 2, '2026-02-01', NULL, 850.00, NULL, 'overdue', NULL, NULL, 'Tenant has not responded to reminders', '2026-03-17 00:04:34.590457', '2026-03-17 00:04:34.590457');
INSERT INTO public.rent_payments VALUES (12, 2, 2, '2026-03-01', NULL, 850.00, NULL, 'pending', NULL, NULL, NULL, '2026-03-17 00:04:34.594064', '2026-03-17 00:04:34.594064');


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tenants VALUES (6, 'Louise', 'Wilson-English', 'louise@wilson-english.uk', '07780888639', 7, '2025-08-22', '2026-08-22', 2150.00, 2480.00, 'active', '', '2026-03-23 19:25:02.267638', '2026-03-23 19:26:47.574', NULL, NULL, NULL, NULL);
INSERT INTO public.tenants VALUES (7, 'Neritan', 'Pali', '0@gmail.com', '0', 8, '2025-08-01', '2026-07-31', 2160.00, 2423.00, 'active', '', '2026-03-23 22:02:54.130925', '2026-03-23 22:02:54.130925', 'Alma', 'Pali', '0@gmail.com', '0');


--
-- Data for Name: tradespeople; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: deals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deals_id_seq', 1, true);


--
-- Name: deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deposits_id_seq', 4, true);


--
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_requests_id_seq', 5, true);


--
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.properties_id_seq', 8, true);


--
-- Name: property_valuations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_valuations_id_seq', 3, true);


--
-- Name: refurb_projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refurb_projects_id_seq', 4, true);


--
-- Name: rent_charges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rent_charges_id_seq', 5, true);


--
-- Name: rent_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rent_payments_id_seq', 12, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_id_seq', 7, true);


--
-- Name: tradespeople_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tradespeople_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict WS64DiZqJo1yiCbAs9zhlE1vhx6hUW1eW4YaNFNjdFoVH3dlNSdw0ZsifuFgKtI

