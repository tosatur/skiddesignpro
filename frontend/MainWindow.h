#pragma once
#include <QMainWindow>
#include <QDoubleSpinBox>
#include <vector>
#include <utility>
#include <string>

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE

namespace backend { class Formula; }

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow();

private slots:
    void onCategoryChanged(const QString& category);
    void onFormulaChanged(int index);
    void onCalculateClicked();

private:
    void populateCategories();
    void populateFormulasForCategory(const QString& category);
    void rebuildInputFields(const backend::Formula* formula);

    Ui::MainWindow* ui;
    std::vector<std::pair<std::string, QDoubleSpinBox*>> inputFields_;
};