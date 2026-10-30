// ESLint للمنصة. ملفات الواجهة سكربتات عادية تتشارك النطاق العام (app.js يعرّف $ وrpc وsb،
// والإضافات تستخدمها)، لذلك قاعدة no-undef معطلة لها؛ بقية قواعد ESLint الموصى بها مفعّلة.
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'vendor/'] },
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  js.configs.recommended,
  {
    files: ['*.js', 'labs/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, supabase: 'readonly', XLSX: 'readonly' }
    },
    rules: {
      'no-undef': 'off',
      // التعابير النمطية ترفض محارف التحكم في مدخلات المستخدم عمدًا (حماية)، فهي ليست خطأ
      'no-control-regex': 'off',
      'no-useless-escape': 'warn',
      // دالة معرّفة مرتين: تبقى تحذيرًا ظاهرًا حتى تُحذف النسخة الأولى غير المستخدمة
      'no-redeclare': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }]
    }
  },
  {
    files: ['eslint.config.js', 'grade-import.js', 'tests/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } }
  }
];
