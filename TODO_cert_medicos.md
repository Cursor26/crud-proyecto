# TODO: Implementar "Gestionar certificado medico"

## Pendientes (0/5)

- [x] 1. Crear tabla `cert_medicos` en bd_crud (SQL script creado: create_cert_medicos_table.sql)
- [x] 2. Agregar 4 rutas CRUD en server/index.js para /certificados-medicos

- [x] 3. Crear client/src/components/CertificadosMedicos.jsx
- [x] 4. Integrar en App.js (sidebar Rec. Humanos, render)
- [ ] 5. Test funcional

## Especificaciones:
**Tabla**: id_cert_medico, carnet_identidad (FK empleado), fecha_emision, fecha_vencimiento, dias_licencia, medico_nombre, descripcion, activo DEFAULT 1
**Roles**: admin, rrhh, produccion
**Component**: Similar a Cargos/Asistencias con fechas, carnet lookup optional.

**Estado: Pendiente plan approval**
