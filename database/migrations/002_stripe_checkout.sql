ALTER TABLE pedidos
    ADD COLUMN stripe_session_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    ADD COLUMN stripe_request_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    ADD COLUMN stripe_estado ENUM('PENDIENTE', 'PAGADO', 'EXPIRADO', 'REEMBOLSADO', 'CANCELADO') DEFAULT NULL,
    ADD UNIQUE KEY uq_pedidos_stripe_session (stripe_session_id),
    ADD UNIQUE KEY uq_pedidos_stripe_request (id_usuario, stripe_request_id);