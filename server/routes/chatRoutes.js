import express from "express";
import { body, param } from "express-validator";
import { getContacts, getMessages, postMessage, readConversation, deleteMessage, deleteConversation, listMonitoredConversations, monitorConversation } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/permissionMiddleware.js";
import validate from "../middleware/validate.js";

const router = express.Router();
router.use(protect, authorize("chat.use"));

const userIdParam = param("userId").isMongoId().withMessage("Invalid user");

router.get("/contacts", getContacts);
router.get("/messages/:userId", [userIdParam], validate, getMessages);
router.post("/messages/:userId", [userIdParam, body("text").trim().notEmpty().withMessage("Message cannot be empty").isLength({ max: 2000 })], validate, postMessage);
router.put("/read/:userId", [userIdParam], validate, readConversation);

// Only the Super Admin holds chat.delete.
router.delete("/messages/:id", authorize("chat.delete"), [param("id").isMongoId()], validate, deleteMessage);
router.delete("/conversations/:a/:b", authorize("chat.delete"), [param("a").isMongoId(), param("b").isMongoId()], validate, deleteConversation);

// Read only oversight. Super Admin sees every conversation, Admin sees all that do not involve the Super Admin.
router.get("/monitor", authorize("chat.monitor"), listMonitoredConversations);
router.get("/monitor/:a/:b", authorize("chat.monitor"), [param("a").isMongoId(), param("b").isMongoId()], validate, monitorConversation);

export default router;
