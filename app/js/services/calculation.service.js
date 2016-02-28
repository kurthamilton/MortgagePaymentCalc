(function() {
    'use strict';

    CalculationService.$inject = ['Statement', 'StatementPeriod'];
    angular.module('app').service('CalculationService', CalculationService);

    function CalculationService(Statement, StatementPeriod) {

        angular.extend(this, {
            getMonthlyPayments: getMonthlyPayments,
            getYearlyPayments: getYearlyPayments
        });

        function getMonthlyPayments(comparison, balance, monthlyPayment) {
            // todo - validate / handle silly values to prevent infinite loop
            if (comparison.mortgages.length == 0 || balance <= 0 || monthlyPayment <= 0) {
                return null;
            }

            let statement = new Statement(balance);
            // add 0-th period
            statement.addPeriod(new StatementPeriod(statement));

            while (statement.balance > 0) {
                for (let i = 0; i < comparison.mortgages.length; i++) {
                    if (i === 0 && statement.periods.length > 0) {
                        // repeat last mortgage until balance = 0
                        i = comparison.mortgages.length - 1;
                    }

                    let mortgage = comparison.mortgages[i];
                    if (!mortgage.term && mortgage.monthlyRate > (monthlyPayment / statement.balance)) {
                        console.log('infinite mortgage encountered');
                        return null;
                    }

                    // repeat term-less mortgages until balance = 0
                    let term = mortgage.term > 0 ? mortgage.term * 12 : Infinity;
                    for (let mortgageMonth = 0; mortgageMonth < term; mortgageMonth++) {
                        let period = new StatementPeriod(statement);
                        if (mortgageMonth === 0) {
                            period.addFee(mortgage.fee, mortgage.includeFee)
                        }
                        period.addInterest(mortgage.monthlyRate);
                        period.makePayment(monthlyPayment);
                        statement.addPeriod(period);

                        if (statement.balance === 0) {
                            return statement;
                        }
                    }
                }

                // get out to prevent infinite loop - this shouldn't be reachable with proper validation
                if (statement.periods.length === 0 || statement.periods.length > 10 && statement.balance > statement.startingBalance) {
                    console.log('monthly payments cannot be calculated');
                    return statement;
                }
            }
        }

        function getYearlyPayments(balance, comparison, monthlyPayment) {
            let statement = getMonthlyPayments(balance, comparison, monthlyPayment);
            return getAggregatedStatement(statement, 12);
        }

        function getAggregatedStatement(source, numberOfMonths) {
            if (!source) {
                return null;
            }

            let periods = angular.copy(source.periods);
            let statement = new Statement(source.startingBalance);
            // add 0-th period
            addAggregatePeriod(statement, 1);
            while (periods.length > 0) {
                addAggregatePeriod(statement, periods.splice(0, numberOfMonths))
            }
            return statement;
        }

        function addAggregatePeriod(statement, periods) {
            if (!periods || periods.length === 0) {
                return null;
            }

            let period = new StatementPeriod(statement);
            for (let i = 0; i < periods.length; i++) {
                let sourcePeriod = periods[i];
                period.addSpend(sourcePeriod.spend);
                if (i === periods.length - 1) {
                    statement.balance = sourcePeriod.balance;
                }
            }
            statement.addPeriod(period);
        }
    }
})();