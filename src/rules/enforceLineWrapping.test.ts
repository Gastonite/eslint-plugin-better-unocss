import { RuleTester } from '@typescript-eslint/rule-tester'
import { enforceLineWrappingRule } from './enforceLineWrapping'

const ruleTester = new RuleTester()

ruleTester.run('enforce-line-wrapping', enforceLineWrappingRule as never, {
  valid: [
    { code: 'cn`p-4`' },
    {
      code: 'cn`p-4 mt-2 flex`',
      options: [{ classesPerLine: 3 }],
    },
    {
      code: `cn\`
  p-4
  mt-2
  flex
\``,
      options: [{ classesPerLine: 1 }],
    },
  ],
  invalid: [
    {
      code: 'cn`p-4 mt-2`',
      options: [{ classesPerLine: 1 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  p-4
  mt-2
\``,
    },
    {
      code: 'cn`p-4 mt-2 flex items-center`',
      options: [{ classesPerLine: 2 }],
      errors: [{ messageId: 'incorrectWrapping' }],
      output: `cn\`
  p-4 mt-2
  flex items-center
\``,
    },
  ],
})
