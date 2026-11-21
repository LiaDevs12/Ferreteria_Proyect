ALTER TABLE usuarios
  ADD COLUMN google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  ADD UNIQUE INDEX uq_usuarios_google_sub (google_sub);