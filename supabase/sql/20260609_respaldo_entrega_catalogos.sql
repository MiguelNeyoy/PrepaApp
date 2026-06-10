-- Respaldo de entrega: catalogos actuales del proyecto TitulacionesUAS.
-- Ejecutar despues de:
-- 1) supabase_schema.sql
-- 2) 20260607_admin_modules.sql
-- 3) 20260609_portal_web_matricula.sql

begin;

insert into public.niveles_estudio (
  id,
  nombre,
  abreviatura,
  pago_mxn,
  color_hex,
  orden,
  activo
)
values
  ('licenciatura', 'Licenciatura', 'Lic.', 3000, '#3b82f6', 1, true),
  ('maestria', 'Maestría', 'Maest.', 3001, '#8b5cf6', 2, true),
  ('doctorado', 'Doctorado', 'Doc.', 3001, '#10b981', 3, true),
  ('prueba', 'Prueba', 'pb', 300, '#3b82f6', 50, true)
on conflict (id) do update set
  nombre = excluded.nombre,
  abreviatura = excluded.abreviatura,
  pago_mxn = excluded.pago_mxn,
  color_hex = excluded.color_hex,
  orden = excluded.orden,
  activo = excluded.activo;

update public.niveles_estudio
set activo = false
where id not in ('licenciatura', 'maestria', 'doctorado', 'prueba');

insert into public.facultades (
  codigo,
  nombre,
  activo
)
values
  ('2206', 'FAC. DE MEDICINA (EXT. MAZATLAN)', true),
  ('4500', 'FAC. DE CIENCIAS SOCIALES MAZATLÁN', true),
  ('4510', 'FAC. DE CIENCIAS ECONÓMICO ADMINISTRATIVAS DE MAZATLÁN', true),
  ('4520', 'FAC. DE DERECHO MAZATLÁN', true),
  ('4530', 'FAC. DE PSICOLOGÍA MAZATLÁN', true),
  ('4540', 'UA DE GASTRONOMÍA Y NUTRICIÓN MAZATLÁN', true),
  ('4550', 'FAC. DE ARQUITECTURA Y DISEÑO INDUSTRIAL', true),
  ('4560', 'UA DE EDUCACIÓN FÍSICA Y DEPORTE MAZATLAN', true),
  ('4570', 'UA DE CIENCIAS DE LA EDUCACIÓN', true),
  ('4610', 'ESCUELA DE TURISMO MAZATLÁN', true),
  ('4700', 'FAC. DE INGENIERÍA Y TECNOLOGÍA DE MAZATLÁN', true),
  ('4800', 'FAC. DE INFORMÁTICA MAZATLÁN', true),
  ('4900', 'FAC. DE CIENCIAS DEL MAR', true),
  ('4920', 'CENTRO DE ESTUDIOS SUPERIORES DE EL ROSARIO', true),
  ('5810', 'FAC. DE TRABAJO SOCIAL MAZATLÁN', true),
  ('5820', 'FAC. DE ENFERMERÍA MAZATLÁN', true),
  ('9054', 'UA DE ARTES EXTENSIÓN MAZATLÁN', true),
  ('9811', 'CENTRO DE ESTUDIOS DE IDIOMAS MAZATLÁN', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  activo = excluded.activo;

update public.facultades
set activo = false
where codigo not in (
  '2206',
  '4500',
  '4510',
  '4520',
  '4530',
  '4540',
  '4550',
  '4560',
  '4570',
  '4610',
  '4700',
  '4800',
  '4900',
  '4920',
  '5810',
  '5820',
  '9054',
  '9811'
);

insert into public.tramites (
  id,
  nombre,
  activo
)
values
  ('titulo', 'TITULO', true)
on conflict (id) do update set
  nombre = excluded.nombre,
  activo = excluded.activo;

update public.tramites
set activo = false
where id not in ('titulo');

insert into public.carreras (
  id,
  facultad_codigo,
  nivel_id,
  nombre,
  activo
)
values
  ('7a813e36-d6ec-4ece-a92f-0da87cb76813'::uuid, '2206', 'licenciatura', 'MÉDICO GENERAL', true),
  ('cbe12887-aeaf-4a15-bee1-331dbe31cc8b'::uuid, '4500', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA COMUNICACIÓN', true),
  ('df35d6a4-a2ab-4330-9e89-02b3dd98d1fc'::uuid, '4500', 'licenciatura', 'LICENCIATURA EN COMERCIO INTERNACIONAL', true),
  ('3bf0b27a-9e90-429b-881c-615191ec7306'::uuid, '4500', 'licenciatura', 'LICENCIATURA EN ECONOMÍA', true),
  ('94dcd4c3-f2c4-4db0-b84a-4358879e987e'::uuid, '4500', 'licenciatura', 'LICENCIATURA EN SOCIOLOGÍA', true),
  ('de453e06-534e-4692-8ead-13476ec682cf'::uuid, '4510', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true),
  ('8873af65-9a7c-46bf-9610-c78481fd1530'::uuid, '4510', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE RECURSOS HUMANOS', true),
  ('2a1c49e9-3325-4db9-8653-e2e552caa794'::uuid, '4510', 'licenciatura', 'LICENCIATURA EN CONTADURÍA PÚBLICA', true),
  ('859768e5-ea96-47c3-88d6-94db32965331'::uuid, '4510', 'licenciatura', 'LICENCIATURA EN MERCADOTECNIA', true),
  ('5f60956a-b2ef-44e9-8478-98694d8b0cf4'::uuid, '4520', 'licenciatura', 'LICENCIATURA EN CRIMINALÍSTICA Y CIENCIAS FORENSES', true),
  ('2524bfa8-6aff-445d-96d2-b4d6aa0fa995'::uuid, '4520', 'licenciatura', 'LICENCIATURA EN DERECHO', true),
  ('9c143060-633a-446f-8e93-f9f994cbb4e3'::uuid, '4520', 'licenciatura', 'LICENCIATURA EN DERECHO MODALIDAD SEMIESCOLARIZADA', true),
  ('d97f8211-095d-4db8-b09a-c7c2bb547a48'::uuid, '4530', 'licenciatura', 'LICENCIATURA EN PSICOLOGÍA', true),
  ('ef035894-a451-4b94-af19-5ddab554019d'::uuid, '4530', 'licenciatura', 'LICENCIATURA EN PSICOLOGÍA SEMIESCOLARIZADA', true),
  ('5ad09e0c-5742-4a77-8352-1a2aa64b0d7a'::uuid, '4540', 'licenciatura', 'LICENCIATURA EN GASTRONOMÍA', true),
  ('c443f94a-28ff-4bf5-8046-88b060189af8'::uuid, '4540', 'licenciatura', 'LICENCIATURA EN NUTRICIÓN', true),
  ('66970b7e-9be7-4ce7-a79d-a772766a78ca'::uuid, '4550', 'licenciatura', 'LICENCIATURA EN ARQUITECTURA', true),
  ('eb94c2d0-e4db-473b-9267-ece935b386cf'::uuid, '4550', 'licenciatura', 'LICENCIATURA EN DISEÑO INDUSTRIAL', true),
  ('95480bc3-0ee3-400f-a70b-00f4c08350ff'::uuid, '4560', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN DEPORTIVA (SEMIESCOLARIZADA)', true),
  ('45b3402d-5bd3-499c-9f29-10962980e78d'::uuid, '4560', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN FÍSICA', true),
  ('ecc2b929-849f-429a-8bfc-e78c888526f3'::uuid, '4570', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN', true),
  ('47073d36-d806-410e-88fb-b40663967b3b'::uuid, '4570', 'licenciatura', 'LICENCIATURA EN CIENCIAS DE LA EDUCACIÓN SEMIESCOLARIZADA', true),
  ('2acd517d-4dc3-4f9a-a263-1851c864a009'::uuid, '4570', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL AREA DE ESPAÑOL', true),
  ('c5534f9d-1c4d-4319-96f1-8e84f72822d9'::uuid, '4570', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN MEDIA EN EL ÁREA DE ESPAÑOL, MODALIDAD SEMIESCOLARIZADA', true),
  ('0e78546e-ab4c-4020-ba61-7c9bf4b015db'::uuid, '4610', 'licenciatura', 'LICENCIATURA EN TURISMO', true),
  ('a5c6b4cf-4814-4af2-86fa-17bccda43751'::uuid, '4700', 'licenciatura', 'LICENCIATURA EN INGENIERÍA CIVIL', true),
  ('4f16c5b7-ded9-4f7f-bfda-b5a9966d0399'::uuid, '4700', 'licenciatura', 'LICENCIATURA EN INGENIERIA EN ENERGÍAS RENOVABLES', true),
  ('3ea50c41-7572-46c2-ae52-df2e29a275bc'::uuid, '4700', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN PROCESOS INDUSTRIALES', true),
  ('afa1157e-1ce7-4da4-8d19-f4ef2f66b164'::uuid, '4800', 'licenciatura', 'LICENCIATURA EN INFORMÁTICA', true),
  ('2c6bd3fe-4950-4719-a498-8e6fbb58290e'::uuid, '4800', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN', true),
  ('c8992817-bc9c-40e7-a0cf-b1d8afff933b'::uuid, '4800', 'licenciatura', 'LICENCIATURA EN INGENIERÍA EN SISTEMAS DE INFORMACIÓN (MODALIDAD VIRTUAL)', true),
  ('7a9f6074-de60-4600-8cd8-f1d8eebc7f1d'::uuid, '4900', 'licenciatura', 'LICENCIATURA EN BIOLOGÍA ACUÍCOLA', true),
  ('9ef4568b-d053-47fa-837b-8770bcefea1c'::uuid, '4900', 'licenciatura', 'LICENCIATURA EN BIOLOGÍA PESQUERA', true),
  ('e23eb400-d19d-4fa7-a248-3a8a2592ad87'::uuid, '4900', 'licenciatura', 'LICENCIATURA EN GESTIÓN DE ZONA COSTERA', true),
  ('c52cf48b-db09-4450-ae66-5a212b671510'::uuid, '4900', 'licenciatura', 'LICENCIATURA EN INGENIERÍA BIOTECNOLOGÍA ACUÁTICA', true),
  ('55bed8bb-5388-41e3-9118-a5a7af6a7ce3'::uuid, '4920', 'licenciatura', 'LICENCIATURA EN ADMINISTRACIÓN DE EMPRESAS', true),
  ('5810e4b9-c2c3-4730-86a9-f636daeb807f'::uuid, '4920', 'licenciatura', 'LICENCIATURA EN INGENIERÍA AGRONÓMICA', true),
  ('bffa6b18-6859-44f1-9149-6de8d28501e2'::uuid, '5810', 'licenciatura', 'LICENCIATURA EN TRABAJO SOCIAL', true),
  ('2ca7807d-06df-4d26-9c17-9f45110a60e2'::uuid, '5810', 'licenciatura', 'LICENCIATURA EN TRABAJO SOCIAL SEMIESCOLARIZADA', true),
  ('ad4c8125-fb84-401e-8e16-8ee59233c371'::uuid, '5820', 'licenciatura', 'LICENCIATURA EN ENFERMERÍA', true),
  ('178b0de4-9bc3-469e-8001-13c500f225ce'::uuid, '9054', 'licenciatura', 'LICENCIATURA EN EDUCACIÓN ARTÍSTICA', true),
  ('df81cc05-461a-4f94-9c3e-35e71748a874'::uuid, '9811', 'licenciatura', 'LICENCIATURA EN ENSEÑANZA DEL IDIOMA INGLES', true)
on conflict (facultad_codigo, nivel_id, nombre) do update set
  id = excluded.id,
  activo = excluded.activo;

update public.carreras
set activo = false
where id not in (
  '7a813e36-d6ec-4ece-a92f-0da87cb76813',
  'cbe12887-aeaf-4a15-bee1-331dbe31cc8b',
  'df35d6a4-a2ab-4330-9e89-02b3dd98d1fc',
  '3bf0b27a-9e90-429b-881c-615191ec7306',
  '94dcd4c3-f2c4-4db0-b84a-4358879e987e',
  'de453e06-534e-4692-8ead-13476ec682cf',
  '8873af65-9a7c-46bf-9610-c78481fd1530',
  '2a1c49e9-3325-4db9-8653-e2e552caa794',
  '859768e5-ea96-47c3-88d6-94db32965331',
  '5f60956a-b2ef-44e9-8478-98694d8b0cf4',
  '2524bfa8-6aff-445d-96d2-b4d6aa0fa995',
  '9c143060-633a-446f-8e93-f9f994cbb4e3',
  'd97f8211-095d-4db8-b09a-c7c2bb547a48',
  'ef035894-a451-4b94-af19-5ddab554019d',
  '5ad09e0c-5742-4a77-8352-1a2aa64b0d7a',
  'c443f94a-28ff-4bf5-8046-88b060189af8',
  '66970b7e-9be7-4ce7-a79d-a772766a78ca',
  'eb94c2d0-e4db-473b-9267-ece935b386cf',
  '95480bc3-0ee3-400f-a70b-00f4c08350ff',
  '45b3402d-5bd3-499c-9f29-10962980e78d',
  'ecc2b929-849f-429a-8bfc-e78c888526f3',
  '47073d36-d806-410e-88fb-b40663967b3b',
  '2acd517d-4dc3-4f9a-a263-1851c864a009',
  'c5534f9d-1c4d-4319-96f1-8e84f72822d9',
  '0e78546e-ab4c-4020-ba61-7c9bf4b015db',
  'a5c6b4cf-4814-4af2-86fa-17bccda43751',
  '4f16c5b7-ded9-4f7f-bfda-b5a9966d0399',
  '3ea50c41-7572-46c2-ae52-df2e29a275bc',
  'afa1157e-1ce7-4da4-8d19-f4ef2f66b164',
  '2c6bd3fe-4950-4719-a498-8e6fbb58290e',
  'c8992817-bc9c-40e7-a0cf-b1d8afff933b',
  '7a9f6074-de60-4600-8cd8-f1d8eebc7f1d',
  '9ef4568b-d053-47fa-837b-8770bcefea1c',
  'e23eb400-d19d-4fa7-a248-3a8a2592ad87',
  'c52cf48b-db09-4450-ae66-5a212b671510',
  '55bed8bb-5388-41e3-9118-a5a7af6a7ce3',
  '5810e4b9-c2c3-4730-86a9-f636daeb807f',
  'bffa6b18-6859-44f1-9149-6de8d28501e2',
  '2ca7807d-06df-4d26-9c17-9f45110a60e2',
  'ad4c8125-fb84-401e-8e16-8ee59233c371',
  '178b0de4-9bc3-469e-8001-13c500f225ce',
  'df81cc05-461a-4f94-9c3e-35e71748a874'
);

commit;
