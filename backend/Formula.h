#pragma once
#include <string>
#include <vector>
#include <map>

namespace backend {

struct Parameter {
    std::string id;
    std::string label;
    std::string unit;
    double defaultValue = 0.0;
};

struct Result {
    bool success = false;
    double value = 0.0;
    std::string unit;
    std::string errorMessage;
};

class Formula {
public:
    virtual ~Formula() = default;

    virtual std::string name() const = 0;
    virtual std::string category() const = 0;
    virtual std::string description() const = 0;
    virtual std::string resultLabel() const = 0;
    virtual std::vector<Parameter> parameters() const = 0;

    virtual Result calculate(const std::map<std::string, double>& inputs) const = 0;

protected:
    static double getInput(const std::map<std::string, double>& inputs, const std::string& id) {
        auto it = inputs.find(id);
        return it != inputs.end() ? it->second : 0.0;
    }
};

} // namespace backend