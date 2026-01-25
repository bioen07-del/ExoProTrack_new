# EXO ProTrack — Передача в новую сессию

## Проект
**Система:** EXO ProTrack — Система мониторинга производства и прослеживаемости экзосом
**Supabase Project ID:** swlzoqemroxdoenqxhnx
**Последний деплой:** https://8dn7jsy4id7p.space.minimax.io
**Версия:** 2.0.0
**Дата релиза:** 22.01.2026

## Ключевые файлы
- **Контекст разработки:** `docs/exo_protrack_context.md`
- **Руководство пользователя:** `docs/USER_MANUAL.md`
- **Changelog:** `docs/CHANGELOG.md`
- **ТЗ:** `user_input_files/ТЗ —1.6_ ИИ_MD.md`
- **Типы Supabase:** `exo-protrack/src/types/database.ts`
- **Шаблон COA:** `docs/coa_template.md`
- **Шаблон SDS:** `user_input_files/SDS-Template.pdf`

## Последние изменения (v2.0.0)

### Snapshot-архитектура (КЛЮЧЕВОЕ)

Реализована система неизменных снимков спецификаций для защиты исторических данных:

| Таблица | Колонка | Назначение |
|---------|---------|------------|
| `product` | `frozen_spec` | Актуальный snapshot (обновляется при редактировании) |
| `request` | `frozen_spec` | Копия на момент создания заявки (неизменный архив) |
| `cm_lot` | `frozen_spec` | Копия на момент создания лота (неизменный архив) |

**Структура frozen_spec:**
```json
{
  "product_code": "EXO-MSC-001",
  "product_name": "Экзосомы из МСК",
  "media": {
    "base_media": {"code": "DMEM-HG", "name": "...", "phenol_red": true},
    "serum_class": "FBS 10%",
    "l_glutamine_mm": 2,
    "additives": [{"code": "GLUT", "name": "Глутамин", "concentration": 2, "unit": "mM"}]
  },
  "pack_format": {"code": "BOT-500", "name": "Флакон 500 мл", "volume_ml": 500},
  "processing": {"raw": [...], "post": [...]},
  "qc": {"raw": [...], "product": [...]},
  "shelf_life_days": 365,
  "frozen_at": "2026-01-22T..."
}
```

**Изменённые файлы:**
- `AdminPage.tsx` — функция `buildFrozenSpec()` при сохранении продукта
- `RequestList.tsx` — копирование frozen_spec при создании заявки
- `CmLotCreate.tsx` — копирование frozen_spec при создании лота
- `ProductRequirementsCard.tsx` — новый пропс `frozenSpec`, fallback на загрузку из БД
- `RequestDetail.tsx`, `CmLotDetail.tsx` — передают frozen_spec в карточки

**Миграция:** `supabase/migrations/1769100000_add_frozen_spec_columns.sql`

### Предыдущие изменения (v1.9.0)
- Сортировка во всех таблицах администрирования
- Детали спецификации среды при выборе в продукте
- Индикатор фенолового красного в dropdown
- Руководство пользователя по ролям

## Архитектура БД (ключевые таблицы)

### Справочники сред
| Таблица | Описание |
|---------|----------|
| `base_media` | Базовые среды (DMEM, IMDM, α-MEM, RPMI и др.) |
| `media_additive` | Добавки (FBS, PRP, Glutamine, HEPES, антибиотики) |
| `media_compatibility_spec` | Спецификации сред (name, serum_class, phenol_red_flag) |
| `media_spec_additives` | Связь спецификаций с добавками |
| `sds_component` | SDS паспорта (16 секций EU-стандарта) |

### Справочники
| Таблица | Описание |
|---------|----------|
| `qc_test_type` | QC тесты (DLS, LAL, NTA, pH, стерильность) |
| `infection_type` | Инфекции (HbsAg, HIV, Syphilis и др.) |
| `cell_type` | Типы клеток |
| `product` | Продукты (с frozen_spec, default_primary_qc, default_product_qc) |
| `pack_format` | Форматы упаковки (purpose: raw/product) |
| `cm_process_method` | Методы процессинга |

### Производство
| Таблица | Описание |
|---------|----------|
| `request` | Заявки (с frozen_spec) |
| `request_line` | Строки заявок |
| `cm_lot` | CM лоты (mode: MTS/MTO, frozen_spec) |
| `culture` | Клеточные культуры |
| `collection_event` | События сбора |
| `processing_step` | Шаги процессинга |
| `container` | Контейнеры |
| `pack_lot` | Лоты фасовки |

### QC/QA
| Таблица | Описание |
|---------|----------|
| `cm_qc_request` | Заявки на QC |
| `cm_qc_result` | Результаты QC |
| `cm_qa_release_decision` | Решения QA |
| `infection_test_result` | Результаты тестов на инфекции |

## Роли и доступ

| Роль | Разделы |
|------|---------|
| Production | Дашборд, CM Лоты, Культуры, Заявки, Склад |
| QC | Дашборд, CM Лоты, QC |
| QA | Дашборд, CM Лоты, QC, QA |
| Manager | Дашборд, CM Лоты, Заявки, Склад |
| Admin | Все разделы |

## Технические особенности

### Snapshot-архитектура (frozen_spec)
- **Формирование:** `AdminPage.tsx` → `buildFrozenSpec()` при сохранении продукта
- **Копирование:** При создании request/cm_lot копируется из product
- **Отображение:** `ProductRequirementsCard` принимает `frozenSpec` пропс
- **Fallback:** Если frozen_spec нет — загружает данные из БД (для старых записей)

### AdminPage.tsx
- **Сортировка:** Компонент `SortableHeader` и хук `useSort`
- **Управление средами:** Объединённый раздел с подтабами
- **Автоопределение serum_class:** useEffect при изменении formData.additives

### pack_format.purpose
- Значения: `'raw'` (для сырья) или `'product'` (для готовой продукции)
- CHECK constraint в БД — только английские значения
- Локализация только в UI

## TODO

### Проверить по бизнес-процессу:
- [ ] QC сырья — передача тестов из frozen_spec
- [ ] Процессинг — передача методов из frozen_spec
- [ ] Pack Lot — возможно нужно добавить frozen_spec
- [ ] Склад — отображение спецификации

### Для существующих данных:
- [ ] Пересохранить продукты через Админку (для генерации frozen_spec)

---
*Обновлено: 22.01.2026*
