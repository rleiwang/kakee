import biz.kakee.Conf
import biz.kakee.Main
import biz.kakee.aeron.Connector
import biz.kakee.events.ClientLogin
import biz.kakee.events.ClientOrder
import biz.kakee.events.ClientOrderStatus
import biz.kakee.pvo.events.Channel
import biz.kakee.pvo.events.Identity
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

class OffLineSpec extends Specification {
    // same as gradle $buildDir
    Path BuildDir = Paths.get(OperatorResources.class.protectionDomain.codeSource.location.path).parent.parent

    @Rule
    DropwizardAppRule<Conf> RULE =
            new DropwizardAppRule<>(Main.class, BuildDir.resolve("resources/main/config.yml").toString())

    @Shared
    GeoLocation location = new GeoLocation(latitude: 37.784732, longitude: -122.427891)

    @Shared
    ClientLogin login = new ClientLogin(sequence: 0, token: "testtoken", geoLocation: location)


    def "client placed order, goes offline, reconnect later"() {
        setup: "initialized polling condition"
        def polls = new PollingConditions(timeout: 10, initialDelay: 1.5, factor: 1.25)

        and: "operator connector"
        def operatorName = "testOperator"
        def operatorMsgs = []
        URI operatorEndPoint = URI.create(String.format("ws://localhost:%d/operators", RULE.getLocalPort()))
        WSTestClient operator = new WSTestClient(operatorEndPoint, { s, m ->
            operatorMsgs << new Expando(session: s, message: m)
        })

        and: "user connector"
        def userName = "testUser"
        def userMsgs = []
        URI userEndPoint = URI.create(String.format("ws://localhost:%d/users", RULE.getLocalPort()));
        WSTestClient user = new WSTestClient(userEndPoint, { s, m ->
            userMsgs << new Expando(session: s, message: m)
        })

        when: "After operator connected, send MyLogin"
        login.token = operatorName
        operator.publish(login)

        and: "After user connected, send MyLogin"
        login.token = userName
        user.publish(login)

        then: "Operator should receive Reply ok"
        polls.eventually {
            assert operatorMsgs.size() > 0
            def reply = new JsonSlurper().parseText(operatorMsgs.last().message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
            operatorMsgs.clear()
        }

        and: "User should receive Reply ok, user then place an order"
        polls.eventually {
            assert userMsgs.size() > 0
            def reply = new JsonSlurper().parseText(userMsgs.last().message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
            userMsgs.clear()

            user.publish(new ClientOrder(token: userName, sequence: 2, geoLocation: location,
                    refCode: "ref", dest: new Identity(operatorName, Channel.operator)))
        }

        then: "Operator should receive user Order"
        def userOrder
        polls.eventually {
            assert operatorMsgs.size() > 0
            userOrder = new JsonSlurper().parseText(operatorMsgs.last().message)
            assert userOrder.topic == "MobileOrder"
            assert userOrder.dest.id == operatorName
            assert userOrder.src.id == userName

            operatorMsgs.clear()
        }

        when: "User disconnected"
        user.close()

        and: "Operator replies with OrderStatus"
        Identity dest = new Identity(userOrder.src.id, Channel.user)
        dest.connector = new Connector(userOrder.src.connector.channel, userOrder.src.connector.streamId)
        operator.publish(new ClientOrderStatus(token: operatorName, sequence: userOrder.sequence + 1,
                geoLocation: location, dest: dest))

        and: "pause for 1 sec"
        sleep(1000)

        and: "user reconnected, send login"
        user = new WSTestClient(userEndPoint, { s, m ->
            userMsgs << new Expando(session: s, message: m)
        })
        login.token = userName
        user.publish(login)

        then: "user should receive Reply ok"
        polls.eventually {
            assert userMsgs.size() > 0
            def reply = new JsonSlurper().parseText(userMsgs.remove(0).message)
            assert reply.topic == 'Reply'
            assert reply.status == 'Ok'
        }

        and: "user should receive order status when he is offline"
        polls.eventually {
            assert userMsgs.size() > 0
            def receipt = new JsonSlurper().parseText(userMsgs.remove(0).message)
            assert receipt.topic == "OrderStatus"
        }
    }
}