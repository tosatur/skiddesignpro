#include "FormulaRegistry.h"
#include <algorithm>

namespace backend {

FormulaRegistry::FormulaRegistry() {

}

FormulaRegistry& FormulaRegistry::instance() {
    static FormulaRegistry registry;
    return registry;
}

void FormulaRegistry::registerFormula(std::unique_ptr<Formula> formula) {
    formulas_.push_back(std::move(formula));
}

std::vector<std::string> FormulaRegistry::categories() const {
    std::vector<std::string> cats;
    for (const auto& f : formulas_) {
        if (std::find(cats.begin(), cats.end(), f->category()) == cats.end()) {
            cats.push_back(f->category());
        }
    }
    return cats;
}

std::vector<const Formula*> FormulaRegistry::formulasInCategory(const std::string& category) const {
    std::vector<const Formula*> result;
    for (const auto& f : formulas_) {
        if (f->category() == category) {
            result.push_back(f.get());
        }
    }
    return result;
}

} // namespace backend