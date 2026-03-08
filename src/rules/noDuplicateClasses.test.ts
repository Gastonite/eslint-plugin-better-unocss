import { RuleTester } from '@typescript-eslint/rule-tester'
import { noDuplicateClassesRule } from './noDuplicateClasses'

const ruleTester = new RuleTester()

ruleTester.run('no-duplicate-classes', noDuplicateClassesRule as never, {
  valid: [
    { code: 'cn("p-4 mt-2 flex")' },
    { code: 'cn("p-4")' },
    { code: 'clsx("p-4", "mt-2")' },
    { code: 'cn`p-4 mt-2 flex`' },
  ],
  invalid: [
    {
      code: 'cn("p-4 mt-2 p-4")',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn("p-4 mt-2")',
    },
    {
      code: 'cn("p-4 p-4 p-4")',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn("p-4")',
    },
    {
      code: 'clsx("flex flex items-center")',
      errors: [{ messageId: 'duplicate' }],
      output: 'clsx("flex items-center")',
    },
    {
      code: 'cn`p-4 mt-2 p-4`',
      errors: [{ messageId: 'duplicate' }],
      output: 'cn`p-4 mt-2`',
    },
  ],
})
