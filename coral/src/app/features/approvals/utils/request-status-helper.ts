import { RequestStatus } from "src/domain/requests";
import { ChipStatus } from "@aivenio/aquarium";

const requestStatusChipStatusMap: {
  [key in RequestStatus]: ChipStatus;
} = {
  ALL: "neutral",
  APPROVED: "success",
  CREATED: "info",
  DECLINED: "warning",
  DELETED: "danger",
};

const requestStatusNameMap: {
  [key in RequestStatus]: string;
} = {
  ALL: "All statuses",
  APPROVED: "Approved",
  CREATED: "Created",
  DECLINED: "Declined",
  DELETED: "Deleted",
};

export { requestStatusNameMap, requestStatusChipStatusMap };
