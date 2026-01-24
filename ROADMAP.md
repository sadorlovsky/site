# Roadmap

Возможные улучшения для админ-панели wishlist-сайта.

## Distributed Rate Limiting

**Текущее состояние:** In-memory rate limiter работает per-instance. В serverless окружении (Vercel) каждый запрос может попасть на новый инстанс, что снижает эффективность лимитов.

**Решение:** Использовать distributed store:
- Vercel KV
- Upstash Redis

**Приоритет:** Низкий для personal сайта с одним админом.

---

## Distributed Session Cleanup

**Текущее состояние:** Throttling очистки expired sessions использует module-level переменную `lastCleanupTime`, которая не работает между serverless инстансами.

**Решение:** Либо использовать distributed store для координации, либо настроить cron job для периодической очистки.

**Приоритет:** Низкий — expired sessions просто остаются в БД до следующей очистки.

---

## Аудит-лог действий админа

**Текущее состояние:** CRUD операции не логируются.

**Решение:** Добавить таблицу `AdminAuditLog` и записывать:
- Кто (session/credential ID)
- Что (create/update/delete item)
- Когда (timestamp)
- Детали (item ID, изменённые поля)

**Приоритет:** Низкий для personal сайта. Полезно для отладки.
