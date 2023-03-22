import {
  cleanup,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { getTopicRequests } from "src/domain/topic/topic-api";
import { transformGetTopicRequestsResponse } from "src/domain/topic/topic-transformer";
import { mockIntersectionObserver } from "src/services/test-utils/mock-intersection-observer";
import { TopicRequests } from "src/app/features/requests/topics/TopicRequests";
import { customRender } from "src/services/test-utils/render-with-wrappers";
import userEvent from "@testing-library/user-event";
import { getEnvironments } from "src/domain/environment";
import { mockedEnvironmentResponse } from "src/app/features/requests/schemas/utils/mocked-api-responses";
import { requestStatusNameMap } from "src/app/features/approvals/utils/request-status-helper";

jest.mock("src/domain/environment/environment-api.ts");
jest.mock("src/domain/topic/topic-api.ts");

const mockGetTopicRequestEnvironments = getEnvironments as jest.MockedFunction<
  typeof getEnvironments
>;

const mockGetTopicRequests = getTopicRequests as jest.MockedFunction<
  typeof getTopicRequests
>;

const mockGetTopicRequestsResponse = transformGetTopicRequestsResponse([
  {
    topicname: "test-topic-1",
    environment: "1",
    topicpartitions: 4,
    teamname: "NCC1701D",
    remarks: "asap",
    description: "This topic is for test",
    replicationfactor: "2",
    environmentName: "BRG",
    topicid: 1000,
    advancedTopicConfigEntries: [
      {
        configKey: "cleanup.policy",
        configValue: "delete",
      },
    ],
    requestOperationType: "CREATE",
    requestor: "jlpicard",
    requesttime: "1987-09-28T13:37:00.001+00:00",
    requesttimestring: "28-Sep-1987 13:37:00",
    requestStatus: "CREATED",
    totalNoPages: "1",
    approvingTeamDetails:
      "Team : NCC1701D, Users : jlpicard, worf, bcrusher, geordilf,",
    teamId: 1003,
    allPageNos: ["1"],
    currentPage: "1",
    editable: true,
    deletable: true,
    deleteAssociatedSchema: false,
  },
]);

describe("TopicRequests", () => {
  beforeEach(() => {
    mockIntersectionObserver();
    mockGetTopicRequestEnvironments.mockResolvedValue(
      mockedEnvironmentResponse
    );
    mockGetTopicRequests.mockResolvedValue(mockGetTopicRequestsResponse);
  });

  afterEach(() => {
    cleanup();
    jest.resetAllMocks();
  });

  it("makes a request to the api to get the teams topic requests", () => {
    customRender(<TopicRequests />, {
      queryClient: true,
      memoryRouter: true,
    });
    expect(getTopicRequests).toBeCalledTimes(1);
  });

  describe("user can filter topic requests based on the topic name", () => {
    afterEach(() => {
      cleanup();
      jest.resetAllMocks();
    });

    it("populates the filter from the url search parameters", () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath: "/?topic=abc",
      });
      expect(getTopicRequests).toHaveBeenNthCalledWith(1, {
        pageNo: "1",
        // search: "abc",
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: "ALL",
      });
    });

    it("applies the topic filter by typing into to the search input", async () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });
      const search = screen.getByRole("search");
      expect(search).toBeVisible();
      expect(search).toHaveAccessibleDescription(
        'Search for an exact match for topic name. Searching starts automatically with a little delay while typing. Press "Escape" to delete all your input.'
      );
      await userEvent.type(search, "abc");
      await waitFor(() => {
        expect(getTopicRequests).toHaveBeenLastCalledWith({
          pageNo: "1",
          // search: "abc",
          isMyRequest: undefined,
          requestStatus: "ALL",
          env: "ALL",
        });
      });
    });
  });

  describe("user can filter topic requests to only display users own requests", () => {
    afterEach(() => {
      cleanup();
      jest.resetAllMocks();
    });

    it("populates the MyRequests filter from the url search parameters", () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath: "/?showOnlyMyRequests=true",
      });
      expect(getTopicRequests).toHaveBeenNthCalledWith(1, {
        pageNo: "1",
        isMyRequest: true,
        search: undefined,
        requestStatus: "ALL",
        env: "ALL",
      });
    });

    it("applies the MyRequest filter by toggling the switch", async () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });
      const isMyRequestSwitch = screen.getByRole("checkbox", {
        name: "Show only my requests",
      });
      await userEvent.click(isMyRequestSwitch);
      await waitFor(() => {
        expect(getTopicRequests).toHaveBeenLastCalledWith({
          pageNo: "1",
          isMyRequest: true,
          search: undefined,
          requestStatus: "ALL",
          env: "ALL",
        });
      });
    });

    it("unapplies the MyRequest filter by untoggling the switch", async () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath: "/?showOnlyMyRequests=true",
      });
      const isMyRequestSwitch = screen.getByRole("checkbox", {
        name: "Show only my requests",
      });
      await userEvent.click(isMyRequestSwitch);
      await waitFor(() => {
        expect(getTopicRequests).toHaveBeenLastCalledWith({
          pageNo: "1",
          isMyRequest: undefined,
          search: undefined,
          requestStatus: "ALL",
          env: "ALL",
        });
      });
    });
  });

  describe("user can browse the requests in paged sets", () => {
    beforeEach(() => {
      mockGetTopicRequestEnvironments.mockResolvedValue(
        mockedEnvironmentResponse
      );
      mockGetTopicRequests.mockResolvedValue({
        totalPages: 1,
        currentPage: 1,
        entries: [],
      });
    });
    afterEach(() => {
      cleanup();
      jest.clearAllMocks();
    });

    it("fetches the right page number if a page is set in search params", async () => {
      const routePath = "/?page=100";
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath: routePath,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));

      expect(mockGetTopicRequests).toHaveBeenCalledWith({
        pageNo: "100",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: "ALL",
      });
    });

    it("fetches the first page if no search param is defined", async () => {
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));

      expect(mockGetTopicRequests).toHaveBeenCalledWith({
        pageNo: "1",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: "ALL",
      });
    });

    it("shows no pagination for a response with only one page", async () => {
      mockGetTopicRequests.mockResolvedValue({
        ...mockGetTopicRequestsResponse,
        totalPages: 1,
      });

      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));

      const pagination = screen.queryByRole("navigation", {
        name: /Pagination/,
      });
      expect(pagination).not.toBeInTheDocument();
    });

    it("shows a pagination when response has more then one page", async () => {
      mockGetTopicRequests.mockResolvedValue({
        totalPages: 2,
        currentPage: 1,
        entries: [],
      });

      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));

      const pagination = screen.getByRole("navigation", {
        name: "Pagination navigation, you're on page 1 of 2",
      });
      expect(pagination).toBeVisible();
    });

    it("shows the currently active page based on api response", async () => {
      mockGetTopicRequests.mockResolvedValue({
        totalPages: 4,
        currentPage: 2,
        entries: [],
      });

      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));

      const pagination = screen.getByRole("navigation", {
        name: "Pagination navigation, you're on page 2 of 4",
      });
      expect(pagination).toBeVisible();
    });
  });

  describe("handles user stepping through pagination", () => {
    beforeEach(async () => {
      mockGetTopicRequestEnvironments.mockResolvedValue(
        mockedEnvironmentResponse
      );
      mockGetTopicRequests.mockResolvedValue({
        totalPages: 3,
        currentPage: 1,
        entries: [],
      });

      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));
    });

    afterEach(() => {
      jest.clearAllMocks();
      cleanup();
    });

    it("shows page 1 as currently active page and the total page number", () => {
      const pagination = screen.getByRole("navigation", {
        name: /Pagination/,
      });

      expect(pagination).toHaveAccessibleName(
        "Pagination navigation, you're on page 1 of 3"
      );
    });

    it("fetches new data when user clicks on next page", async () => {
      const pageTwoButton = screen.getByRole("button", {
        name: "Go to next page, page 2",
      });

      await userEvent.click(pageTwoButton);

      expect(mockGetTopicRequests).toHaveBeenNthCalledWith(2, {
        pageNo: "2",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: "ALL",
      });
    });
  });

  describe("user can filter schema requests by 'environment'", () => {
    beforeEach(async () => {
      mockGetTopicRequestEnvironments.mockResolvedValue(
        mockedEnvironmentResponse
      );
      mockGetTopicRequests.mockResolvedValue(mockGetTopicRequestsResponse);
      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath:
          "/?environment=TEST_ENV_THAT_CANNOT_BE_PART_OF_ANY_API_MOCK",
      });
      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));
    });

    afterEach(() => {
      jest.resetAllMocks();
      cleanup();
    });

    it("populates the filter from the url search parameters", () => {
      expect(mockGetTopicRequests).toHaveBeenNthCalledWith(1, {
        pageNo: "1",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: "TEST_ENV_THAT_CANNOT_BE_PART_OF_ANY_API_MOCK",
      });
    });

    it("enables user to filter by 'environment'", async () => {
      const environmentFilter = screen.getByRole("combobox", {
        name: "Filter by Environment",
      });

      const environmentOption = screen.getByRole("option", {
        name: mockedEnvironmentResponse[0].name,
      });
      await userEvent.selectOptions(environmentFilter, environmentOption);

      expect(mockGetTopicRequests).toHaveBeenNthCalledWith(2, {
        pageNo: "1",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "ALL",
        env: mockedEnvironmentResponse[0].id,
      });
    });
  });

  describe("user can filter schema requests by 'status'", () => {
    beforeEach(async () => {
      mockGetTopicRequestEnvironments.mockResolvedValue(
        mockedEnvironmentResponse
      );
      mockGetTopicRequests.mockResolvedValue(mockGetTopicRequestsResponse);

      customRender(<TopicRequests />, {
        queryClient: true,
        memoryRouter: true,
        customRoutePath:
          "/?status=TEST_STATUS_THAT_CANNOT_BE_PART_OF_ANY_API_MOCK",
      });

      await waitForElementToBeRemoved(screen.getByTestId("skeleton-table"));
    });

    afterEach(() => {
      jest.resetAllMocks();
      cleanup();
    });

    it("populates the filter from the url search parameters", () => {
      expect(mockGetTopicRequests).toHaveBeenNthCalledWith(1, {
        pageNo: "1",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: "TEST_STATUS_THAT_CANNOT_BE_PART_OF_ANY_API_MOCK",
        env: "ALL",
      });
    });

    it("enables user to filter by 'status'", async () => {
      const newStatus = "CREATED";

      const statusFilter = screen.getByRole("combobox", {
        name: "Filter by status",
      });
      const statusOption = screen.getByRole("option", {
        name: requestStatusNameMap[newStatus],
      });
      await userEvent.selectOptions(statusFilter, statusOption);

      expect(mockGetTopicRequests).toHaveBeenNthCalledWith(2, {
        pageNo: "1",
        search: undefined,
        isMyRequest: undefined,
        requestStatus: newStatus,
        env: "ALL",
      });
    });
  });
});