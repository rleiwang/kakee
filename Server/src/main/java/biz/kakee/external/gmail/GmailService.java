package biz.kakee.external.gmail;

import biz.kakee.pvo.Menu;
import biz.kakee.pvo.Receipt;
import biz.kakee.utils.Crypto;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.Base64;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.GmailScopes;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.text.StrSubstitutor;

import javax.activation.DataHandler;
import javax.activation.URLDataSource;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.GeneralSecurityException;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.function.Supplier;

@Slf4j
public class GmailService {

    @Data
    public static class BouncedMessage {
        private final boolean bounced;
        private final Message message;
    }

    /**
     * Application name.
     */
    private static final String USER_NAME = "kakee@tristonetech.com";

    /**
     *
     */
    private static ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);

    private static Gmail GmailService;

    public static Gmail getGamil() {
        return GmailService;
    }

    public static CompletableFuture<BouncedMessage>
    pollBouncedEmail(final Message sent, final Instant sentTime) {
        final CompletableFuture<BouncedMessage> future = new CompletableFuture<>();

        final Function<Boolean, Boolean> task = pollEmail(sent, future);
        scheduleNextPolling(task, sentTime.plus(10, ChronoUnit.MINUTES), 10, TimeUnit.SECONDS);

        return future;
    }

    private static void
    scheduleNextPolling(Function<Boolean, Boolean> task, Instant expiry, long delay, TimeUnit timeUnit) {
        ses.schedule(() -> {
            if (task.apply(Instant.now().isAfter(expiry))) {
                scheduleNextPolling(task, expiry, delay, timeUnit);
            }
        }, delay, timeUnit);
    }

    // return a function, isExpired, input -> is_expired, return -> should continue
    private static Function<Boolean, Boolean>
    pollEmail(Message sent, CompletableFuture<BouncedMessage> future) {
        return expired -> {
            if (expired) {
                future.complete(new BouncedMessage(false, sent));
            } else {
                try {
                    Message bounced = fetchBouncedEmail(sent);
                    if (bounced != null) {
                        future.complete(new BouncedMessage(true, bounced));
                        expired = true;
                    }
                } catch (Exception e) {
                    future.completeExceptionally(e);
                    expired = true;
                }
            }

            return !expired;
        };
    }

    private static Message fetchBouncedEmail(Message sent) throws IOException {
        List<Message> messages = GmailService.users().threads()
                .get(USER_NAME, sent.getThreadId())
                .execute()
                .getMessages();

        // should be more than 1, sent and reply
        if (messages.size() > 1) {
            for (Message msg : messages) {
                MessagePart payload = msg.getPayload();
                for (MessagePartHeader header : payload.getHeaders()) {
                    if (header.getName().equals("Return-Path") && "<>".equals(header.getValue())) {
                        return sent;
                    }
                }
            }
        }

        return null;
    }

    public static CompletableFuture<Message> sendVerificationCode(String email, String code, String expiry) {
        CompletableFuture<Message> future = new CompletableFuture<>();
        try {
            Message msg = createEmail(email, USER_NAME, "Kakee verification code",
                    String.format("Your verification code is %s. It will expire after %s." +
                            "\n\nThank you from Kakee team", code, expiry));
            future.complete(GmailService.users().messages().send(USER_NAME, msg).execute());
        } catch (Exception e) {
            log.error("error sending verification code to " + email, e);
            future.completeExceptionally(e);
        }

        return future;
    }

    public static CompletableFuture<Message> sendWelcome(String email) {
        return sendTemplateEmail(email, "Welcome to Kakee", "welcome");
    }

    public static CompletableFuture<Message> sendInvitation(String email, String code) {
        CompletableFuture<Message> future = new CompletableFuture<>();
        try {
            Message msg = createEmailWithAttachementImg(email, USER_NAME, "Invitation from Kakee",
                    () -> {
                        try {
                            Map<String, String> values = new HashMap<>();
                            values.put("PROMOCODE", code);
                            StrSubstitutor substitutor = new StrSubstitutor(values);
                            return substitutor.replace(readTemplate("invitation.html"));
                        } catch (Exception e) {
                            log.error("error generate invitation html with promo code " + code + " to " + email, e);
                        }

                        return null;
                    },
                    "KakeeOperator");
            future.complete(GmailService.users().messages().send(USER_NAME, msg).execute());
        } catch (Exception e) {
            log.error("error sending invitation html with promo code " + code + " to " + email, e);
            future.completeExceptionally(e);
        }

        return future;
    }

    public static CompletableFuture<Message> sendReferral(String email, String operator, String code) {
        CompletableFuture<Message> future = new CompletableFuture<>();
        try {
            Message msg = createEmailWithAttachement(email, USER_NAME, "Thank you for your referral",
                    () -> {
                        try {
                            Map<String, String> values = new HashMap<>();
                            values.put("OPERATOR", operator);
                            values.put("PROMOCODE", code);
                            StrSubstitutor substitutor = new StrSubstitutor(values);
                            return substitutor.replace(readTemplate("referral.html"));
                        } catch (Exception e) {
                            log.error("error generate referral html with from " + email + " to " + operator, e);
                        }

                        return null;
                    });
            future.complete(GmailService.users().messages().send(USER_NAME, msg).execute());
        } catch (Exception e) {
            log.error("error sending referral html with from " + email + " to " + operator, e);
            future.completeExceptionally(e);
        }

        return future;
    }

    public static CompletableFuture<Message> sendReceipt(String email, Receipt receipt) {
        CompletableFuture<Message> future = new CompletableFuture<>();
        try {
            Message msg = createEmailWithAttachementImg(email, receipt.getReplyEmail(), "receipt",
                    () -> {
                        try {
                            NumberFormat moneyFormat = NumberFormat.getCurrencyInstance(receipt.getLocale());
                            NumberFormat percentFormat = DecimalFormat.getPercentInstance(receipt.getLocale());
                            percentFormat.setMinimumFractionDigits(2);
                            DateTimeFormatter dtf = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM)
                                    .withLocale(receipt.getLocale())
                                    .withZone(receipt.getZoneOffset());

                            ZonedDateTime zdt = Instant.ofEpochMilli(receipt.getTimestamp())
                                    .atZone(receipt.getZoneOffset());

                            Map<String, String> values = new HashMap<>();
                            values.put("FOOD_TRUCK_NAME", receipt.getName());
                            values.put("DISCOUNT", moneyFormat.format(receipt.getDiscount()));
                            values.put("SUBTOTAL", moneyFormat.format(receipt.getSubTotal()));
                            values.put("TOTAL", moneyFormat.format(receipt.getTotal()));
                            values.put("TAX", moneyFormat.format(receipt.getTax()));
                            values.put("TAX_RATE", percentFormat.format(receipt.getTaxRate()));
                            values.put("MENU_ITEMS", convertMenuItems(receipt));
                            values.put("DATE_TIME", zdt.format(dtf));
                            values.put("INVOICE_NUM", receipt.getInvoice());
                            StrSubstitutor substitutor = new StrSubstitutor(values);
                            return substitutor.replace(readTemplate("receipt.html"));
                        } catch (Exception e) {
                            log.error("error generate receipt html " + receipt, e);
                        }

                        return null;
                    },
                    "KakeeUser");
            future.complete(GmailService.users().messages().send(USER_NAME, msg).execute());
        } catch (Exception e) {
            //log.error("error sending verification code to " + email, e);
            e.printStackTrace();
            future.completeExceptionally(e);
        }

        return future;
    }

    private static String convertMenuItems(Receipt receipt) {
        // <tr>
        // <td>Service 3</td>
        // <td class="alignright">$4.00</td>
        // </tr>
        String row = "<tr><td width='5%%'>%s</td><td width='75%%'>%s</td><td class='alignright'>%s</td></tr>";
        return receipt.getItems().stream()
                .reduce(new StringBuilder(),
                        (sb, item) -> {
                            sb.append(String.format(row, item.getQuantity(), item.getName(),
                                    NumberFormat.getCurrencyInstance(receipt.getLocale()).format(Float.parseFloat(item.getPrice()))));
                            return appendSubItems(sb, item.getSubItems(), receipt.getLocale());
                        },
                        (left, right) -> left)
                .toString();
    }

    private static StringBuilder appendSubItems(StringBuilder sb, List<Menu.Item> subItems, Locale locale) {
        String row = "<tr><td width='5%%'></td><td width='75%%' class='alignleft'>%s</td><td class='alignright'>%s</td></tr>";
        for (Menu.Item subItem : subItems) {
            String price = StringUtils.isEmpty(subItem.getPrice()) ? "" :
                    NumberFormat.getCurrencyInstance(locale).format(Float.parseFloat(subItem.getPrice()));
            sb.append(String.format(row, subItem.getName(), price));
        }

        return sb;
    }

    private static CompletableFuture<Message> sendTemplateEmail(String email, String subject, String template) {
        CompletableFuture<Message> future = new CompletableFuture<>();
        try {
            Message msg = createEmailWithAttachement(email, USER_NAME, subject, template);
            future.complete(GmailService.users().messages().send(USER_NAME, msg).execute());
        } catch (Exception e) {
            //log.error("error sending verification code to " + email, e);
            future.completeExceptionally(e);
        }

        return future;
    }

    /**
     * Build and return an authorized Gmail client service.
     *
     * @return an authorized Gmail client service
     */
    public static void start(String encrypted, char[] passwd) {
        try {
            HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            JsonFactory jsonFactory = JacksonFactory.getDefaultInstance();

            final byte[] key = Crypto.decryptBytesWithPasswd(passwd, encrypted);
            Credential credential = createServiceAccount(httpTransport, jsonFactory, key);
            GmailService = new Gmail.Builder(httpTransport, jsonFactory, credential)
                    .setApplicationName("food truck")
                    .build();
        } catch (IOException | GeneralSecurityException e) {
            log.error("unable to initialize gmail service", e);
            throw new RuntimeException(e);
        }
    }

    // in google console api console
    // 1. create service account, to avoid enter password at startup
    // 2. download json file,
    // encrypt it with password
    private static GoogleCredential createServiceAccount(HttpTransport transport, JsonFactory jsonFactory, byte[] json)
            throws GeneralSecurityException, IOException {
        GoogleCredential credential = GoogleCredential.fromStream(new ByteArrayInputStream(json));

        return new GoogleCredential.Builder()
                .setServiceAccountPrivateKey(credential.getServiceAccountPrivateKey())
                .setServiceAccountPrivateKeyId(credential.getServiceAccountPrivateKeyId())
                .setServiceAccountId(credential.getServiceAccountId())
                .setServiceAccountUser(USER_NAME)
                .setServiceAccountScopes(Arrays.asList(GmailScopes.GMAIL_COMPOSE, GmailScopes.GMAIL_READONLY))
                .setTokenServerEncodedUrl(credential.getTokenServerEncodedUrl())
                .setTransport(transport)
                .setJsonFactory(jsonFactory)
                .setClock(credential.getClock())
                .build();
    }

    /**
     * Create a MimeMessage using the parameters provided.
     *
     * @param to       email address of the receiver
     * @param from     email address of the sender, the mailbox account
     * @param subject  subject of the email
     * @param bodyText body text of the email
     * @return the MimeMessage to be used to send email
     * @throws MessagingException
     */
    public static Message createEmail(String to, String from, String subject, String bodyText)
            throws MessagingException, IOException {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);

        email.setFrom(new InternetAddress(from));
        email.addRecipient(javax.mail.Message.RecipientType.TO,
                new InternetAddress(to));
        email.setSubject(subject);
        email.setText(bodyText);
        return toGmailMessage(email);
    }

    /**
     * Create a MimeMessage using the parameters provided.
     *
     * @param to      Email address of the receiver.
     * @param from    Email address of the sender, the mailbox account.
     * @param subject Subject of the email.
     * @return MimeMessage to be used to send email.
     * @throws MessagingException
     */
    public static Message createEmailWithAttachement(String to, String from,
                                                     String subject, String html) throws Exception {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);

        email.setFrom(new InternetAddress(from));
        email.addRecipient(javax.mail.Message.RecipientType.TO,
                new InternetAddress(to));
        email.setSubject(subject);

        MimeBodyPart mimeBodyPart = new MimeBodyPart();
        mimeBodyPart.setContent(readTemplate(html + ".html"), "text/html");
        mimeBodyPart.setHeader("Content-Type", "text/html; charset=\"UTF-8\"");

        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(mimeBodyPart);
        email.setContent(multipart);
        return toGmailMessage(email);
    }

    /**
     * Create a MimeMessage using the parameters provided.
     *
     * @param to      Email address of the receiver.
     * @param from    Email address of the sender, the mailbox account.
     * @param subject Subject of the email.
     * @return MimeMessage to be used to send email.
     * @throws MessagingException
     */
    public static Message createEmailWithAttachement(String to, String from,
                                                     String subject, Supplier<String> html) throws Exception {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);

        email.setFrom(new InternetAddress(from));
        email.addRecipient(javax.mail.Message.RecipientType.TO,
                new InternetAddress(to));
        email.setSubject(subject);

        MimeBodyPart mimeBodyPart = new MimeBodyPart();
        mimeBodyPart.setContent(html.get(), "text/html");
        mimeBodyPart.setHeader("Content-Type", "text/html; charset=\"UTF-8\"");

        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(mimeBodyPart);
        email.setContent(multipart);
        return toGmailMessage(email);
    }

    /**
     * Create a MimeMessage using the parameters provided.
     *
     * @param to      Email address of the receiver.
     * @param from    Email address of the sender, the mailbox account.
     * @param subject Subject of the email.
     * @return MimeMessage to be used to send email.
     * @throws MessagingException
     */
    public static Message
    createEmailWithAttachementImg(String to, String from, String subject, Supplier<String> html, String img) throws Exception {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage email = new MimeMessage(session);

        email.setFrom(new InternetAddress(from));
        email.addRecipient(javax.mail.Message.RecipientType.TO,
                new InternetAddress(to));
        email.setSubject(subject);

        MimeBodyPart mimeBodyPart = new MimeBodyPart();
        mimeBodyPart.setContent(html.get(), "text/html");
        mimeBodyPart.setHeader("Content-Type", "text/html; charset=\"UTF-8\"");

        MimeBodyPart kakeeIcon = new MimeBodyPart();
        URLDataSource iconDS = new URLDataSource(Paths.get("conf", "email", img + ".png").toUri().toURL());
        kakeeIcon.setDataHandler(new DataHandler(iconDS));
        kakeeIcon.setContentID("<" + img + ".png>");
        kakeeIcon.setDisposition(MimeBodyPart.INLINE);

        MimeBodyPart appleBadge = new MimeBodyPart();
        URLDataSource badgeDS = new URLDataSource(Paths.get("conf", "email", "AppleBadge.png").toUri().toURL());
        appleBadge.setDataHandler(new DataHandler(badgeDS));
        appleBadge.setContentID("<AppleBadge.png>");
        appleBadge.setDisposition(MimeBodyPart.INLINE);

        Multipart multipart = new MimeMultipart();
        multipart.addBodyPart(mimeBodyPart);
        multipart.addBodyPart(kakeeIcon);
        multipart.addBodyPart(appleBadge);
        email.setContent(multipart);
        return toGmailMessage(email);
    }

    /**
     * Create a message from an email.
     *
     * @param emailContent Email to be set to raw of message
     * @return a message containing a base64url encoded email
     * @throws IOException
     * @throws MessagingException
     */
    public static Message toGmailMessage(MimeMessage emailContent) throws MessagingException, IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        emailContent.writeTo(buffer);
        byte[] bytes = buffer.toByteArray();
        String encodedEmail = Base64.encodeBase64URLSafeString(bytes);
        Message message = new Message();
        message.setRaw(encodedEmail);
        return message;
    }

    private static String readTemplate(String name) throws IOException {
        return IOUtils.toString(Paths.get("conf", "email", name).toUri(), StandardCharsets.UTF_8);
    }
}