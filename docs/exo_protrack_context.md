# EXO-PROTRACK: Контекст для продолжения

## Реализовано: Snapshot-архитектура (Вариант C)

### Что сделано

1. ✅ **Миграция БД** — добавлены колонки `frozen_spec JSONB`:
   - `product.frozen_spec` — актуальный snapshot (обновляется при редактировании)
   - `request.frozen_spec` — копия на момент создания заявки (неизменный архив)
   - `cm_lot.frozen_spec` — копия на момент создания лота (неизменный архив)

2. ✅ **AdminPage.tsx** — при сохранении продукта формируется `frozen_spec`:
   - Функция `buildFrozenSpec()` собирает полную спецификацию
   - Включает: media (base_media + additives), pack_format, processing, qc, shelf_life

3. ✅ **RequestList.tsx** — при создании заявки копируется `frozen_spec` из product

4. ✅ **CmLotCreate.tsx** — при создании лота копируется `frozen_spec` из product

5. ✅ **ProductRequirementsCard.tsx** — обновлён для работы с `frozenSpec`:
   - Новый пропс `frozenSpec?: any`
   - Если передан — использует его без загрузки из БД
   - Fallback на старый способ если frozenSpec нет

6. ✅ **RequestDetail.tsx** — передаёт `frozenSpec` из request

7. ✅ **CmLotDetail.tsx** — передаёт `frozenSpec` из cm_lot

---

## Структура frozen_spec

```json
{
  "product_code": "EXO-MSC-001",
  "product_name": "Экзосомы из МСК",
  "product_type": "Finished",
  "media": {
    "media_spec_id": "uuid",
    "name": "DMEM-HG + FBS 10%",
    "base_media": {
      "code": "DMEM-HG",
      "name": "DMEM High Glucose",
      "phenol_red": true
    },
    "serum_class": "FBS 10%",
    "l_glutamine_mm": 2,
    "additives": [
      {"code": "GLUT", "name": "Глутамин", "concentration": 2, "unit": "mM", "type": "supplement"}
    ]
  },
  "pack_format": {
    "code": "BOT-500",
    "name": "Флакон 500 мл",
    "volume_ml": 500,
    "purpose": "product"
  },
  "processing": {
    "raw": [{"method_id": "uuid", "name": "Фильтрация", "cycles": 1}],
    "post": [{"method_id": "uuid", "name": "Аликвотирование"}]
  },
  "qc": {
    "raw": [{"code": "STER", "name": "Стерильность"}],
    "product": [{"code": "ENDO", "name": "Эндотоксины"}]
  },
  "shelf_life_days": 365,
  "frozen_at": "2026-01-22T01:55:00.000Z"
}
```

---

## Что нужно проверить

### Бизнес-процесс от заявки до хранения:

1. **Заявка (Request)** — ✅ frozen_spec копируется при создании
2. **CM Lot** — ✅ frozen_spec копируется при создании
3. **QC сырья** — нужно проверить передачу требований из frozen_spec
4. **Процессинг** — нужно проверить передачу методов из frozen_spec
5. **QC продукта** — нужно проверить передачу тестов из frozen_spec
6. **Pack Lot** — возможно нужно добавить frozen_spec
7. **Склад** — проверить отображение спецификации

### Для существующих данных:

Нужно обновить frozen_spec для существующих продуктов:
```sql
-- После деплоя: пересохранить все продукты через AdminPage
-- или создать скрипт миграции данных
```

---

## Файлы проекта

- `supabase/migrations/1769100000_add_frozen_spec_columns.sql` — миграция
- `exo-protrack/src/pages/AdminPage.tsx` — функция buildFrozenSpec()
- `exo-protrack/src/pages/RequestList.tsx` — копирование frozen_spec
- `exo-protrack/src/pages/CmLotCreate.tsx` — копирование frozen_spec
- `exo-protrack/src/components/ProductRequirementsCard.tsx` — отображение frozen_spec
- `exo-protrack/src/pages/RequestDetail.tsx` — передача frozen_spec
- `exo-protrack/src/pages/CmLotDetail.tsx` — передача frozen_spec
