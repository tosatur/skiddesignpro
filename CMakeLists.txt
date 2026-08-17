cmake_minimum_required(VERSION 3.16)
project(skiddesignpro LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(QT NAMES Qt6 Qt5 REQUIRED COMPONENTS Widgets)
find_package(Qt${QT_VERSION_MAJOR} REQUIRED COMPONENTS Widgets)

set(BACKEND_SOURCES
    backend/FormulaRegistry.cpp
)

set(BACKEND_HEADERS
    backend/Formula.h
    backend/FormulaRegistry.h
)

set(FRONTEND_SOURCES
    frontend/MainWindow.cpp
)

set(FRONTEND_HEADERS
    frontend/MainWindow.h
)

set(FRONTEND_FORMS
    frontend/MainWindow.ui
)

add_executable(skiddesignpro
    main.cpp
    ${BACKEND_SOURCES}
    ${BACKEND_HEADERS}
    ${FRONTEND_SOURCES}
    ${FRONTEND_HEADERS}
    ${FRONTEND_FORMS}
)

target_link_libraries(skiddesignpro PRIVATE Qt${QT_VERSION_MAJOR}::Widgets)