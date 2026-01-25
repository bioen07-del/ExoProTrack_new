-- Migration: add_fk_constraints_for_joins
-- Created at: 1769072046

-- Добавляем FK для request_line -> request
ALTER TABLE request_line 
ADD CONSTRAINT fk_request_line_request 
FOREIGN KEY (request_id) REFERENCES request(request_id) ON DELETE CASCADE;

-- Добавляем FK для reservation -> request_line
ALTER TABLE reservation 
ADD CONSTRAINT fk_reservation_request_line 
FOREIGN KEY (request_line_id) REFERENCES request_line(request_line_id) ON DELETE SET NULL;

-- Добавляем FK для reservation -> cm_lot
ALTER TABLE reservation 
ADD CONSTRAINT fk_reservation_cm_lot 
FOREIGN KEY (cm_lot_id) REFERENCES cm_lot(cm_lot_id) ON DELETE CASCADE;;