import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const apiMocks =
  vi.hoisted(() => ({
    getTicketDetail:
      vi.fn(),

    uploadAttachment:
      vi.fn(),

    removeAttachment:
      vi.fn(),

    downloadAttachment:
      vi.fn(),
  }));

vi.mock(
  "../../src/api",
  () => ({
    getTicketDetail:
      apiMocks.getTicketDetail,

    uploadAttachment:
      apiMocks.uploadAttachment,

    removeAttachment:
      apiMocks.removeAttachment,

    downloadAttachment:
      apiMocks.downloadAttachment,
  })
);

import RequesterTicketDetail from "../../src/RequesterTicketDetail";

const requester = {
  id: 1,

  name:
    "Jennifer Anderson",

  email:
    "jennifer@example.com",
};

const activeAttachment = {
  id: 50,

  originalFilename:
    "evidence.pdf",

  mimeType:
    "application/pdf",

  sizeBytes: 2048,

  isRemoved: false,

  uploadedAt:
    "2026-09-01T10:00:00.000Z",

  removedAt: null,

  removalReason:
    null,
};

const removedAttachment = {
  id: 51,

  originalFilename:
    "old-image.png",

  mimeType:
    "image/png",

  sizeBytes: 1024,

  isRemoved: true,

  uploadedAt:
    "2026-09-01T09:00:00.000Z",

  removedAt:
    "2026-09-01T11:00:00.000Z",

  removalReason:
    "Uploaded by mistake",
};

const ticketDetail = {
  id: 10,

  ticketNumber:
    "TKT-2026-000010",

  requesterId: 1,

  categoryId: 1,

  relatedSystemId: 1,

  summary:
    "Laptop battery drains quickly",

  description:
    "Laptop battery loses charge within one hour.",

  requestedPriority:
    "HIGH",

  currentStatus:
    "NEW",

  itPriority: null,

  createdAt:
    "2026-09-01T08:00:00.000Z",

  updatedAt:
    "2026-09-01T09:00:00.000Z",

  requester,

  category: {
    id: 1,
    name: "Hardware",
  },

  relatedSystem: {
    id: 1,

    name:
      "Corporate Laptop",
  },

  attachments: [
    activeAttachment,
    removedAttachment,
  ],
};

function freshTicket() {
  return JSON.parse(
    JSON.stringify(
      ticketDetail
    )
  );
}

describe(
  "Attachment Section",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      apiMocks.getTicketDetail.mockResolvedValue(
        freshTicket()
      );
    });

    it(
      "shows active and removed Attachment metadata",
      async () => {
        render(
          <RequesterTicketDetail
            requester={
              requester
            }
            ticketId={10}
            onBack={() => {}}
          />
        );

        expect(
          await screen.findByText(
            "evidence.pdf"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "old-image.png"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            /uploaded by mistake/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "button",
            {
              name:
                /download evidence\.pdf/i,
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /download old-image\.png/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    it(
      "uploads a valid Attachment",
      async () => {
        const uploaded = {
          id: 60,

          originalFilename:
            "new-proof.png",

          mimeType:
            "image/png",

          sizeBytes:
            1000,

          isRemoved:
            false,

          uploadedAt:
            "2026-09-03T08:00:00.000Z",

          removedAt:
            null,

          removalReason:
            null,
        };

        apiMocks.uploadAttachment.mockResolvedValue(
          uploaded
        );

        render(
          <RequesterTicketDetail
            requester={
              requester
            }
            ticketId={10}
            onBack={() => {}}
          />
        );

        await screen.findByText(
          "evidence.pdf"
        );

        const file =
          new File(
            [
              "image-data",
            ],

            "new-proof.png",

            {
              type:
                "image/png",
            }
          );

        fireEvent.change(
          screen.getByLabelText(
            /add attachment/i
          ),

          {
            target: {
              files: [
                file,
              ],
            },
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /upload attachment/i,
            }
          )
        );

        await waitFor(() => {
          expect(
            apiMocks.uploadAttachment
          ).toHaveBeenCalledWith(
            1,
            10,
            file
          );
        });

        expect(
          await screen.findByText(
            "new-proof.png"
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "rejects an unsupported file before calling the API",
      async () => {
        render(
          <RequesterTicketDetail
            requester={
              requester
            }
            ticketId={10}
            onBack={() => {}}
          />
        );

        await screen.findByText(
          "evidence.pdf"
        );

        const file =
          new File(
            [
              "hello",
            ],

            "notes.txt",

            {
              type:
                "text/plain",
            }
          );

        fireEvent.change(
          screen.getByLabelText(
            /add attachment/i
          ),

          {
            target: {
              files: [
                file,
              ],
            },
          }
        );

        expect(
          await screen.findByText(
            /only jpg, jpeg, png, webp, and pdf files are allowed/i
          )
        ).toBeInTheDocument();

        expect(
          apiMocks.uploadAttachment
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "soft-removes an Attachment with a reason",
      async () => {
        apiMocks.removeAttachment.mockResolvedValue(
          {
            ...activeAttachment,

            isRemoved:
              true,

            removedAt:
              "2026-09-03T09:00:00.000Z",

            removalReason:
              "Wrong evidence",
          }
        );

        render(
          <RequesterTicketDetail
            requester={
              requester
            }
            ticketId={10}
            onBack={() => {}}
          />
        );

        await screen.findByText(
          "evidence.pdf"
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /remove evidence\.pdf/i,
            }
          )
        );

        fireEvent.change(
          screen.getByLabelText(
            /removal reason/i
          ),

          {
            target: {
              value:
                "Wrong evidence",
            },
          }
        );

        fireEvent.click(
          screen.getByRole(
            "button",
            {
              name:
                /confirm remove/i,
            }
          )
        );

        await waitFor(() => {
          expect(
            apiMocks.removeAttachment
          ).toHaveBeenCalledWith(
            1,
            50,
            "Wrong evidence"
          );
        });

        expect(
          await screen.findByText(
            /wrong evidence/i
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /download evidence\.pdf/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );
  }
);