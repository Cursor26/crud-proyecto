-- RF21 — Histórico de producción: copia de registros antes de actualizar o al eliminar
-- RF22 — usuario_email guarda quién provocó el archivado
-- Ejecutar en bd_crud (MySQL 5.7+). Ajuste el tamaño de datos_json si lo necesita.

USE bd_crud;

CREATE TABLE IF NOT EXISTS `produccion_historico` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `fuente` enum('sacrificio','matadero','leche') NOT NULL,
  `fecha_dato` date NOT NULL COMMENT 'Fecha del registro de producción (día operativo)',
  `accion` varchar(32) NOT NULL COMMENT 'actualizacion | eliminacion',
  `datos_json` longtext NOT NULL COMMENT 'Snapshot JSON de la fila archivada',
  `usuario_email` varchar(255) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fuente_fecha` (`fuente`,`fecha_dato`),
  KEY `idx_creado_en` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
