# Исправление ошибки Node.js версии

## Проблема

Railway использовал Node.js 18.20.5, что вызывало ошибку:
```
TypeError: Cannot read properties of undefined (reading 'get')
at webidl-conversions/lib/index.js:325
```

## Причина

1. **Node.js 18 устарел**: Supabase и другие зависимости требуют Node.js 20+
2. **Несовместимость API**: `ArrayBuffer.prototype.resizable` доступен только в Node.js 20+
3. **Зависимости**: `webidl-conversions`, `whatwg-url` (через `isomorphic-dompurify` и `@supabase/supabase-js`) требуют Node.js 20+

## Решение

Обновлен `backend/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x"]  # Было: nodejs-18_x
```

## Результат

После деплоймента Railway будет использовать Node.js 20, что:
- ✅ Исправит ошибку `webidl-conversions`
- ✅ Устранит предупреждения Supabase о депрекации Node 18
- ✅ Обеспечит совместимость со всеми зависимостями

## Проверка

После успешного деплоймента проверить:
1. Логи не содержат ошибок `webidl-conversions`
2. Нет предупреждений о депрекации Node.js 18
3. Backend запускается успешно
