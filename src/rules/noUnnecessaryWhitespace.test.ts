import { RuleTester } from '@typescript-eslint/rule-tester'
import { noUnnecessaryWhitespaceRule } from './noUnnecessaryWhitespace'

const ruleTester = new RuleTester()

ruleTester.run('no-unnecessary-whitespace', noUnnecessaryWhitespaceRule as never, {
  valid: [
    { code: 'cn("p-4 mt-2 flex")' },
    { code: 'cn("p-4")' },
    { code: 'cn("")' },
  ],
  invalid: [
    {
      code: 'cn("p-4  mt-2")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("  p-4 mt-2  ")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("p-4    mt-2    flex")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'cn("p-4 mt-2 flex")',
    },
    {
      code: 'clsx("  p-4  ")',
      errors: [{ messageId: 'unnecessaryWhitespace' }],
      output: 'clsx("p-4")',
    },
  ],
})
