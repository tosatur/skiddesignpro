#include "MainWindow.h"
#include "ui_MainWindow.h"
#include "../backend/FormulaRegistry.h"
#include "../backend/Formula.h"

#include <QMessageBox>

MainWindow::MainWindow(QWidget* parent) : QMainWindow(parent), ui(new Ui::MainWindow) {
    ui->setupUi(this);

    connect(ui->categoryCombo, &QComboBox::currentTextChanged, this, &MainWindow::onCategoryChanged);
    connect(ui->formulaCombo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &MainWindow::onFormulaChanged);
    connect(ui->calculateButton, &QPushButton::clicked, this, &MainWindow::onCalculateClicked);

    populateCategories();
}

MainWindow::~MainWindow() {
    delete ui;
}

void MainWindow::populateCategories() {
    ui->categoryCombo->clear();
    for (const auto& cat : backend::FormulaRegistry::instance().categories()) {
        ui->categoryCombo->addItem(QString::fromStdString(cat));
    }
    if (ui->categoryCombo->count() > 0) {
        onCategoryChanged(ui->categoryCombo->currentText());
    }
}

void MainWindow::onCategoryChanged(const QString& category) {
    populateFormulasForCategory(category);
}

void MainWindow::populateFormulasForCategory(const QString& category) {
    ui->formulaCombo->blockSignals(true);
    ui->formulaCombo->clear();
    auto formulas = backend::FormulaRegistry::instance().formulasInCategory(category.toStdString());
    for (const auto* f : formulas) {
        ui->formulaCombo->addItem(QString::fromStdString(f->name()));
    }
    ui->formulaCombo->blockSignals(false);

    if (ui->formulaCombo->count() > 0) {
        onFormulaChanged(0);
    }
}

void MainWindow::onFormulaChanged(int index) {
    if (index < 0) return;
    auto formulas = backend::FormulaRegistry::instance().formulasInCategory(ui->categoryCombo->currentText().toStdString());
    if (index >= static_cast<int>(formulas.size())) return;

    const backend::Formula* formula = formulas[index];
    ui->descriptionLabel->setText(QString::fromStdString(formula->description()));
    rebuildInputFields(formula);
    ui->resultLabel->clear();
}

void MainWindow::rebuildInputFields(const backend::Formula* formula) {
    while (ui->inputsLayout->rowCount() > 0) {
        ui->inputsLayout->removeRow(0);
    }
    inputFields_.clear();

    for (const auto& param : formula->parameters()) {
        auto* spin = new QDoubleSpinBox(ui->inputsGroup);
        spin->setRange(-1.0e12, 1.0e12);
        spin->setDecimals(6);
        spin->setValue(param.defaultValue);

        QString labelText = QString::fromStdString(param.label) +
                             QString(" [%1]").arg(QString::fromStdString(param.unit));
        ui->inputsLayout->addRow(labelText, spin);
        inputFields_.emplace_back(param.id, spin);
    }
}

void MainWindow::onCalculateClicked() {
    auto formulas = backend::FormulaRegistry::instance().formulasInCategory(ui->categoryCombo->currentText().toStdString());
    int index = ui->formulaCombo->currentIndex();
    if (index < 0 || index >= static_cast<int>(formulas.size())) return;

    const backend::Formula* formula = formulas[index];

    std::map<std::string, double> inputs;
    for (const auto& [id, spin] : inputFields_) {
        inputs[id] = spin->value();
    }

    backend::Result result = formula->calculate(inputs);
    if (!result.success) {
        QMessageBox::warning(this, "Calculation error", QString::fromStdString(result.errorMessage));
        ui->resultLabel->clear();
        return;
    }

    ui->resultLabel->setText(QString("%1 = %2 %3")
                               .arg(QString::fromStdString(formula->resultLabel()))
                               .arg(result.value, 0, 'g', 6)
                               .arg(QString::fromStdString(result.unit)));
}