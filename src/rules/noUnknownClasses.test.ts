import { RuleTester } from '@typescript-eslint/rule-tester'
import { noUnknownClassesRule } from './noUnknownClasses'



const ruleTester = new RuleTester()

ruleTester.run('no-unknown-classes', noUnknownClassesRule as never, {
  valid: [
    // Standard UnoCSS classes
    { code: 'cn("flex items-center")' },
    { code: 'cn("p-4 m-2 mt-4")' },
    { code: 'cn("text-red-500 bg-blue-500")' },

    // With variants
    { code: 'cn("hover:bg-red-500")' },
    { code: 'cn("md:flex lg:hidden")' },
    { code: 'cn("dark:text-white")' },

    // Empty or whitespace only
    { code: 'cn("")' },
    { code: 'cn("  ")' },
  ],

  invalid: [
    // Unknown class
    {
      code: 'cn("not-a-class")',
      errors: [{ messageId: 'unknown' }],
    },

    // Unknown class among valid ones
    {
      code: 'cn("flex typo-class p-4")',
      errors: [{ messageId: 'unknown' }],
    },

    // Variant with unknown class
    {
      code: 'cn("hover:not-exists")',
      errors: [{ messageId: 'unknown' }],
    },

    // Multiple unknown classes
    {
      code: 'cn("unknown-1 flex unknown-2")',
      errors: [{ messageId: 'unknown' }, { messageId: 'unknown' }],
    },

    // Typo in common class
    {
      code: 'cn("flx items-center")',
      errors: [{ messageId: 'unknown' }],
    },
  ],
})
