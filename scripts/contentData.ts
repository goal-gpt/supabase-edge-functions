// Putting in 1 sample content item to demonstrate how to use this
const cardItemData: CardItemData[] = [
  {
    link: "https://www.bogleheads.org/wiki/Household_budgeting",
    imgSrc: "https://www.bogleheads.org/w/images/BogleheadsSiteLogo.svg",
    title: "Household budgeting",
    text:
      "Individuals establish a household budget in an effort to understand their cash flow- how much they make and how much they spend. A budget is a tool that can help individuals plan for desired purchases and establish savings for reaching financial goals.",
    categories: [
      "budgeting",
      "retirement planning",
      "savings",
      "debt reduction",
    ],
    length: 0,
    points: 0,
    questionItems: [
      {
        question: "Why do individuals establish a household budget?",
        correctAnswer: "All of the above",
        incorrectAnswers: [
          "To track their cash flows",
          "To plan for desired purchases and establish savings",
          "To keep spending under control",
        ],
      },
      {
        question:
          "What is the difference between a descriptive and prescriptive budget?",
        correctAnswer:
          "Descriptive budgets simply track cash flows while prescriptive budgets plan for future spending",
        incorrectAnswers: [
          "Descriptive budgets plan for future spending while prescriptive budgets simply track cash flows",
          "Descriptive budgets control income and spending while prescriptive budgets do not",
          "Descriptive budgets do not track income and expenses while prescriptive budgets do",
        ],
      },
      {
        question: "What are some ways to control flexible expenses?",
        correctAnswer: "Prioritize needs over wants",
        incorrectAnswers: [
          "Cut expenses to the bare minimum",
          "Increase spending to improve quality of life",
          "None of the above",
        ],
      },
      {
        question: "The Bogleheads recommend paying yourself first.",
        correctAnswer: "first",
      },
    ],
    testedContent:
      "Individuals establish a household budget in an effort to understand their cash flow- how much they make and how much they spend. A budget is a tool that can help individuals plan for desired purchases and establish savings for reaching financial goals. Budgets are often essential for people who desire to keep spending under control. For individuals approaching retirement tracking income and expenses can help determine the needed income required for retirement planning.\nA budget can be descriptive, in that it simply tracks a household's cash flows[note 1] or prescriptive, in which a plan of future spending is budgeted, and income and spending is controlled in an attempt to track the proposed budget.\nPerhaps the most important idea underlying the Bogleheads approach to investing is recognizing you need to save a significant portion of income every month to have enough money for a comfortable retirement. There is no substitute for spending less than you earn.\nThe Bogleheads approach to developing a workable financial plan is to have a sensible household budget - one that provides for needed expenditures, discretionary pleasures, savings for big ticket items, and savings for long term retirement planning. Avoid excess debt, such as credit cards and home equity loans. If you have such debt, pay off those balances first. Reduce expenses and unneeded debt so you can consistently set aside a portion of earnings for decades. If you don't save enough, no amount of financial trickery will provide the returns needed for a comfortable retirement.\nBudget worksheets are available from many sources; choose a format that you are comfortable with. The example below illustrates the process.\nRecord your income in the left column. As you can see from the example below, there are spaces on your worksheet for other incomes sources that might fit your personal situation. As you record your income, be sure to consider whether income sources are continuous or whether they might stop in the near future. For example, if your receive unemployment benefits, keep in mind when you will stop receiving these benefits.\nYou also might want to make adjustments for income you receive on a yearly or quarterly basis, such as tax refunds or bonus checks.\nCalculate your total income by adding the numbers in the left column. This number represents the amount of income you receive in a month.\nNext, list your monthly expenses in the right-hand column.\nBegin by listing your fixed expenses. Fixed expenses are items you have little or no control over. You will pay a fixed amount for these expenses each month.\nThe next group is flexible expenses, which are expenses that you can control. When thinking about flexible expenses, think about what you need and what you want. This will help you to control your spending in this category. What are some ways that you could control the costs of these expenses?\nAlso, make sure to pay yourself first. Set aside money from each paycheck and put it towards your savings. You will notice in the example below that “savings” is listed as an expense.\nCalculate your total expenses by adding the numbers in the right column. This number represents the amount of expenses you spend in a month.\nNow, compare your Total Income (left column) against Total Expenses (right column). If your income is more than your expenses, you are spending less than you earn and are on the right path to live below your means.\nOtherwise, you should replan your budget and reconsider whether or not you are ready to invest.",
  },
];

module.exports = {
  cardItemData,
};
