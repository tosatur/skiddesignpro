#pragma once
#include "Formula.h"
#include <memory>
#include <vector>
#include <string>

namespace backend {

class FormulaRegistry {
public:
    static FormulaRegistry& instance();

    std::vector<std::string> categories() const;
    std::vector<const Formula*> formulasInCategory(const std::string& category) const;

private:
    FormulaRegistry();
    void registerFormula(std::unique_ptr<Formula> formula);

    std::vector<std::unique_ptr<Formula>> formulas_;
};

} // namespace backend