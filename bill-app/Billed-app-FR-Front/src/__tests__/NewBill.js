/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import userEvent from "@testing-library/user-event";
import { expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js"
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {

    document.body.innerHTML = NewBillUI();

    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    let newBillPage = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage });

    test("Then mail icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));

      const mailIcon = screen.getByTestId("icon-mail");
      expect(mailIcon.getAttribute("class")).toContain("active-icon");

    });

    test("Then there should be a form to edit a new Bill", () => {
      document.body.innerHTML = NewBillUI();
      let form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();
    })

    test("Then the form should be submitted by clicking on the submit button", async () => {
      const handleSubmitMock = jest.fn(newBillPage.handleSubmit);
      await waitFor(() => screen.getByTestId("form-new-bill"));

      const newBillFormButton = screen.getByTestId("form-new-bill");
      newBillFormButton.addEventListener("submit", handleSubmitMock);

      fireEvent.submit(newBillFormButton);
      expect(handleSubmitMock).toHaveBeenCalled();
    });

  })
})

describe("Given I am connected as an employee", () => {


  describe("When I am on NewBill Page and I upload a file with valid format", () => {
    document.body.innerHTML = NewBillUI();

    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    let newBillPage = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage });

    const mockHandleChangeFile = jest.fn(newBillPage.handleChangeFile);
    const inputFile = screen.getByTestId("file");
    const file = new File(["image"], "image.jpg", { type: "image/jpg" });
    inputFile.addEventListener("change", mockHandleChangeFile);
    userEvent.upload(inputFile, file);

    test("Then it should call the handleChangeFile function", () => {
      expect(mockHandleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0]).toStrictEqual(file)
    })

    test("Then it should update the input field", () => {
      expect(inputFile.files[0].name).toBe("image.jpg");
    })

  })
})

describe("Given I am connected as an employee", () => {

  describe("When the file format is not valid", () => {

    test("Then an error message appear", async () => {

      document.body.innerHTML = NewBillUI();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      let newBillPage = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage });

      const mockEvent = {
        preventDefault: jest.fn(),
        target: {
          value: 'path/to/file.pdf'
        }
      }

      newBillPage.handleChangeFile(mockEvent)
      expect(screen.getByText("Merci de saisir un format valide, jpg, jpeg, png")).not.toHaveClass('hidden')

    })
  })


})

// Test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  describe("When I create new Bill", () => {
    test("then send bill to mock API POST", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" })) // Définition de la clé user dans le localstorage.
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router(); // On appelle le routeur pour préparer à l'utilisation de la route NewBill
      window.onNavigate(ROUTES_PATH.NewBill);
      jest.spyOn(mockStore, "bills"); // On espionne la méthode bills.

      mockStore.bills.mockImplementationOnce(() => { // On simule une méthode create qui renvoit une promise résolue.
        return {
          create: () => {
            return Promise.resolve();
          },
        };
      });

      await new Promise(process.nextTick); // On attends que toutes les tâches soient exécutées.

      document.body.innerHTML = BillsUI({}) // Remplace le contenu HTML du body.
      expect(screen.getByText("Mes notes de frais")).toBeTruthy(); // On s'attends à voir la chaîne de caractère Mes notes de frais sur la page.

    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {

        localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.NewBill);
        jest.spyOn(mockStore, "bills");

      });

      test("send bill to an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => { // On simule une méthode create qui renvoit une promise rejetté en erreur 404.
          return {
            create: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });

        await new Promise(process.nextTick); // On attends que toutes les tâches soient exécutées.

        document.body.innerHTML = BillsUI({ error: "Erreur 404" }) // Remplace le contenu HTML du body.
        const message = screen.getByTestId("error-message");
        expect(message.textContent).toContain("404"); // On s'attends à voir la chaîne de caractère 404.
      });
    });

    test("send bill to an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => { // On simule une méthode create qui renvoit une promise rejetté en erreur 500.
        return {
          create: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      await new Promise(process.nextTick);
      document.body.innerHTML = BillsUI({ error: "Erreur 500" })
      const message = screen.getByTestId("error-message");
      expect(message.textContent).toContain("500"); // On s'attends à voir la chaîne de caractère 500.

    });
  });
});