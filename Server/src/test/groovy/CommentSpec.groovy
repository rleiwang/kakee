import biz.kakee.Conf
import biz.kakee.Main
import biz.kakee.events.ClientLoadConversation
import biz.kakee.events.ClientLogin
import biz.kakee.events.ClientNewComment
import biz.kakee.events.ClientUnreadSummary
import biz.kakee.pvo.geo.GeoLocation
import biz.kakee.resources.OperatorResources
import biz.kakee.websockets.WSTestClient
import groovy.json.JsonSlurper
import io.dropwizard.testing.junit.DropwizardAppRule
import org.junit.Rule
import spock.lang.Shared
import spock.lang.Specification
import spock.util.concurrent.PollingConditions

import java.nio.file.Path
import java.nio.file.Paths

class CommentSpec extends Specification {
    // same as gradle $buildDir
    Path BuildDir = Paths.get(OperatorResources.class.protectionDomain.codeSource.location.path).parent.parent

    @Rule
    DropwizardAppRule<Conf> RULE =
            new DropwizardAppRule<>(Main.class, BuildDir.resolve("resources/main/config.yml").toString())

    @Shared
    GeoLocation location = new GeoLocation(latitude: 37.784732, longitude: -122.427891)

    @Shared
    ClientLogin login = new ClientLogin(sequence: 0, token: "testtoken", geoLocation: location)

    def "client post a comment"() {
        setup: "initialized polling condition"
        def polls = new PollingConditions(timeout: 10, initialDelay: 1.5, factor: 1.25)

        and: "operator connector"
        def operatorName = "E8D69595-8403-49BC-BBB2-D97F3D87E53A"
        def operatorMsgs = []
        URI operatorEndPoint = URI.create(String.format("ws://localhost:%d/operators", RULE.getLocalPort()))
        WSTestClient operator = new WSTestClient(operatorEndPoint, { s, m ->
            operatorMsgs << new Expando(session: s, message: m)
        })

        and: "user connector"
        def userName = "D2416A09-7CD6-4E54-A0D5-441328B1071D"
        def userMsgs = []
        URI userEndPoint = URI.create(String.format("ws://localhost:%d/users", RULE.getLocalPort()));
        WSTestClient user = new WSTestClient(userEndPoint, { s, m ->
            userMsgs << new Expando(session: s, message: m)
        })

        when: "After operator connected, send MyLogin"
        login.installID = operatorName
        operator.publish(login)

        and: "After user connected, send MyLogin"
        login.installID = userName
        user.publish(login)

        then: "Operator should receive Reply ok"
        polls.eventually {
            assert operatorMsgs.size() > 0
            def reply = new JsonSlurper().parseText(operatorMsgs.first().message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
            operatorMsgs.clear()
        }

        and: "User should receive Reply ok, user then place an order"
        polls.eventually {
            assert userMsgs.size() > 0
            def reply = new JsonSlurper().parseText(userMsgs.first().message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
            userMsgs.clear()

            user.publish(new ClientNewComment(recipientId: operatorName, msg: "test1", installID: userName,
                    token: userName, sequence: 2, geoLocation: location))
        }

        then: "Operator should receive user Order, send out order receipt"
        operator.publish(new ClientUnreadSummary(token: operatorName, sequence: 4, geoLocation: location, installID: operatorName))

        polls.eventually {
            assert operatorMsgs.size() > 0
            def userOrder = new JsonSlurper().parseText(operatorMsgs.last().message)
            assert userOrder.src.id == userName

        }
    }

    def "operator pull comments"() {
        setup: "initialized polling condition"
        def polls = new PollingConditions(timeout: 10, initialDelay: 1.5, factor: 1.25)
        def userName = "testUser"
        def operatorName = "testOperator"

        and: "operator connector"
        def operatorMsgs = []
        URI operatorEndPoint = URI.create(String.format("ws://localhost:%d/operators", RULE.getLocalPort()))
        WSTestClient operator = new WSTestClient(operatorEndPoint, { s, m ->
            operatorMsgs << new Expando(session: s, message: m)
        })

        when: "After operator connected, send MyLogin"
        login.installID = operatorName
        operator.publish(login)

        then: "Operator should receive Reply ok"
        polls.eventually {
            assert operatorMsgs.size() > 0
            def reply = new JsonSlurper().parseText(operatorMsgs.first().message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
            operatorMsgs.clear()
        }

        then: "Operator should receive user Order, send out order receipt"
        operator.publish(new ClientLoadConversation(token: operatorName, sequence: 4, geoLocation: location,
                installID: operatorName, senderId: userName))

        polls.eventually {
            assert operatorMsgs.size() > 0
            def userOrder = new JsonSlurper().parseText(operatorMsgs.last().message)
            assert userOrder.src.id == userName

        }
    }
}